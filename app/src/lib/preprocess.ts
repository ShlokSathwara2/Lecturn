const MAX_DIM = 2048
const JPEG_QUALITY = 0.85
const CROP_THRESHOLD = 25
const CROP_PADDING = 0.02

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

  const cropped = autoCrop(ctx, img.width, img.height)
  const processedBlob = await compressAndResize(cropped.ctx, cropped.w, cropped.h)

  const processedUrl = URL.createObjectURL(processedBlob)

  const originalBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9))

  URL.revokeObjectURL(img.src)

  return { originalBlob, processedBlob, originalUrl, processedUrl }
}
