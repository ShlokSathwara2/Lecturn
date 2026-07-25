"use client"

import { useRef, useEffect, useCallback } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

const COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1",
]

let activeParticles: Particle[] = []
let animFrame: number | null = null

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function spawnParticle(x: number, y: number) {
  const angle = Math.random() * Math.PI * 2
  const speed = 0.3 + Math.random() * 1.2
  activeParticles.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.5,
    life: 1,
    maxLife: 0.6 + Math.random() * 0.6,
    color: randomColor(),
    size: 2 + Math.random() * 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 6,
  })
}

export default function TouchParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerDown = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const tick = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.02
      p.life -= 0.016 / p.maxLife
      p.rotation += p.rotationSpeed

      if (p.life <= 0) {
        activeParticles.splice(i, 1)
        continue
      }

      const alpha = Math.max(0, p.life)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 6 * alpha
      ctx.beginPath()
      ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size, 1)
      ctx.fill()
      ctx.restore()
    }

    if (activeParticles.length > 0) {
      animFrame = requestAnimationFrame(tick)
    } else {
      animFrame = null
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return
      pointerDown.current = true
      lastPos.current = { x: e.clientX, y: e.clientY }
      for (let i = 0; i < 4; i++) spawnParticle(e.clientX, e.clientY)
      if (!animFrame) animFrame = requestAnimationFrame(tick)
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointerDown.current) return
      const dx = e.clientX - lastPos.current.x
      const dy = e.clientY - lastPos.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const count = Math.min(3, Math.max(1, Math.floor(dist / 8)))
      for (let i = 0; i < count; i++) {
        const t = i / count
        spawnParticle(
          lastPos.current.x + dx * t,
          lastPos.current.y + dy * t
        )
      }
      lastPos.current = { x: e.clientX, y: e.clientY }
    }

    function onPointerUp() {
      pointerDown.current = false
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
    document.addEventListener("pointercancel", onPointerUp)

    return () => {
      window.removeEventListener("resize", resize)
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
      document.removeEventListener("pointercancel", onPointerUp)
      if (animFrame) cancelAnimationFrame(animFrame)
    }
  }, [tick])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    />
  )
}
