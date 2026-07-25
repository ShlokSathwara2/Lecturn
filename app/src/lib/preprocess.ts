const MAX_DIM = 2048
const JPEG_QUALITY = 0.85
const CROP_THRESHOLD = 25
const CROP_PADDING = 0.02
const EDGE_THRESHOLD = 50

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function getCanvasCtx(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")!
  return { canvas: c, ctx }
}

function toGrayscale(data: Uint8ClampedArray, len: number): Uint8Array {
  const g = new Uint8Array(len / 4)
  for (let i = 0; i < len; i += 4) {
    g[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }
  return g
}

function sobelEdge(gray: Uint8Array, w: number, h: number): Uint8Array {
  const edges = new Uint8Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx = -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
        - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
        - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)]
      const gy = -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
        + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)]
      edges[i] = Math.min(255, Math.sqrt(gx * gx + gy * gy))
    }
  }
  return edges
}

function detectCorners(edges: Uint8Array, w: number, h: number): { x: number; y: number }[] {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 100))
  const margin = Math.floor(Math.min(w, h) * 0.05)

  function findStrongestEdge(sx: number, sy: number, ex: number, ey: number): { x: number; y: number; score: number } {
    let best = { x: sx, y: sy, score: 0 }
    for (let y = sy; y < ey; y += step) {
      for (let x = sx; x < ex; x += step) {
        const score = edges[y * w + x]
        if (score > best.score) best = { x, y, score }
      }
    }
    return best
  }

  const qW = Math.floor(w / 2)
  const qH = Math.floor(h / 2)

  const tl = findStrongestEdge(margin, margin, qW, qH)
  const tr = findStrongestEdge(qW, margin, w - margin, qH)
  const bl = findStrongestEdge(margin, qH, qW, h - margin)
  const br = findStrongestEdge(qW, qH, w - margin, h - margin)

  return [
    { x: tl.x, y: tl.y },
    { x: tr.x, y: tr.y },
    { x: br.x, y: br.y },
    { x: bl.x, y: bl.y },
  ]
}

function orderCorners(corners: { x: number; y: number }[]) {
  const sorted = [...corners].sort((a, b) => a.y - b.y)
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x)
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x)
  return [top[0], top[1], bottom[1], bottom[0]]
}

function perspectiveTransform(
  srcCtx: CanvasRenderingContext2D, sw: number, sh: number,
  corners: { x: number; y: number }[]
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const ordered = orderCorners(corners)
  const [tl, tr, br, bl] = ordered

  const maxW = Math.max(
    Math.sqrt((br.x - bl.x) ** 2 + (br.y - bl.y) ** 2),
    Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2)
  )
  const maxH = Math.max(
    Math.sqrt((tr.x - br.x) ** 2 + (tr.y - br.y) ** 2),
    Math.sqrt((tl.x - bl.x) ** 2 + (tl.y - bl.y) ** 2)
  )

  if (maxW < sw * 0.4 || maxH < sh * 0.4) return null

  const dw = Math.round(maxW)
  const dh = Math.round(maxH)
  const { canvas, ctx } = getCanvasCtx(dw, dh)

  const srcCanvas = srcCtx.canvas
  const sx = corners.map(c => c.x)
  const sy = corners.map(c => c.y)
  const dx = [0, dw - 1, dw - 1, 0]
  const dy = [0, 0, dh - 1, dh - 1]

  const step = Math.max(1, Math.floor(Math.min(dw, dh) / 400))

  for (let dyi = 0; dyi < dh; dyi += step) {
    for (let dxi = 0; dxi < dw; dxi += step) {
      const u = dxi / (dw - 1)
      const v = dyi / (dh - 1)

      const srcX = (1 - u) * (1 - v) * sx[0] + u * (1 - v) * sx[1] + u * v * sx[2] + (1 - u) * v * sx[3]
      const srcY = (1 - u) * (1 - v) * sy[0] + u * (1 - v) * sy[1] + u * v * sy[2] + (1 - u) * v * sy[3]

      if (srcX >= 0 && srcX < sw && srcY >= 0 && srcY < sh) {
        ctx.drawImage(srcCanvas, srcX - 1, srcY - 1, 3, 3, dxi, dyi, step, step)
      }
    }
  }

  return { canvas, ctx }
}

function autoLevels(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data

  let min = 255, max = 0
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    if (gray < min) min = gray
    if (gray > max) max = gray
  }

  const range = max - min
  if (range < 5) return

  const scale = 255 / range
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, Math.max(0, (d[i] - min) * scale))
    d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - min) * scale))
    d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - min) * scale))
  }

  ctx.putImageData(imageData, 0, 0)
}

function detectCropBounds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data

  function isActive(x: number, y: number) {
    const i = (y * w + x) * 4
    return d[i] > CROP_THRESHOLD || d[i + 1] > CROP_THRESHOLD || d[i + 2] > CROP_THRESHOLD
  }

  const step = Math.max(1, Math.floor(Math.min(w, h) / 200))

  let top = 0, bottom = h - 1, left = 0, right = w - 1

  topLoop: for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (isActive(x, y)) { top = Math.max(0, y - 10); break topLoop }
    }
  }

  bottomLoop: for (let y = h - 1; y >= 0; y -= step) {
    for (let x = 0; x < w; x += step) {
      if (isActive(x, y)) { bottom = Math.min(h - 1, y + 10); break bottomLoop }
    }
  }

  leftLoop: for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      if (isActive(x, y)) { left = Math.max(0, x - 10); break leftLoop }
    }
  }

  rightLoop: for (let x = w - 1; x >= 0; x -= step) {
    for (let y = 0; y < h; y += step) {
      if (isActive(x, y)) { right = Math.min(w - 1, x + 10); break rightLoop }
    }
  }

  const padX = (right - left) * CROP_PADDING
  const padY = (bottom - top) * CROP_PADDING
  return {
    x: Math.max(0, left - padX),
    y: Math.max(0, top - padY),
    width: Math.min(w - left, right - left + padX * 2),
    height: Math.min(h - top, bottom - top + padY * 2),
  }
}

function autoCrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bounds = detectCropBounds(ctx, w, h)
  if (bounds.width < w * 0.3 || bounds.height < h * 0.3) return { ctx, w, h }

  const { canvas: cropped, ctx: dst } = getCanvasCtx(bounds.width, bounds.height)
  dst.drawImage(ctx.canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height)
  return { ctx: dst, w: bounds.width, h: bounds.height }
}

function compressAndResize(
  ctx: CanvasRenderingContext2D, w: number, h: number
): Promise<Blob> {
  let fw = w, fh = h
  if (fw > MAX_DIM || fh > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / fw, MAX_DIM / fh)
    fw = Math.round(fw * ratio)
    fh = Math.round(fh * ratio)
  }

  const { canvas, ctx: out } = getCanvasCtx(fw, fh)
  out.drawImage(ctx.canvas, 0, 0, fw, fh)
  autoLevels(out, fw, fh)

  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", JPEG_QUALITY)
  )
}

export interface PreprocessResult {
  originalBlob: Blob
  processedBlob: Blob
  originalUrl: string
  processedUrl: string
}

export async function preprocess(file: File): Promise<PreprocessResult> {
  const img = await loadImage(file)
  const { canvas, ctx } = getCanvasCtx(img.width, img.height)

  ctx.drawImage(img, 0, 0)
  const originalUrl = canvas.toDataURL("image/jpeg", 0.9)

  const gray = toGrayscale(ctx.getImageData(0, 0, img.width, img.height).data, img.width * img.height * 4)
  const edges = sobelEdge(gray, img.width, img.height)
  const corners = detectCorners(edges, img.width, img.height)

  let workCtx = ctx
  let workW = img.width
  let workH = img.height

  const transformed = perspectiveTransform(ctx, img.width, img.height, corners)
  if (transformed) {
    workCtx = transformed.ctx
    workW = transformed.canvas.width
    workH = transformed.canvas.height
  }

  const cropped = autoCrop(workCtx, workW, workH)
  const processedBlob = await compressAndResize(cropped.ctx, cropped.w, cropped.h)

  const processedUrl = URL.createObjectURL(processedBlob)

  const originalBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9))

  URL.revokeObjectURL(img.src)

  return { originalBlob, processedBlob, originalUrl, processedUrl }
}
