"use client"

import { useRef, useEffect, useCallback } from "react"
import { useAccent } from "@/lib/AccentContext"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  r: number
  g: number
  b: number
  size: number
}

let particles: Particle[] = []
let raf: number | null = null

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function spawn(x: number, y: number, r: number, g: number, b: number, boost: number) {
  const angle = Math.random() * Math.PI * 2
  const speed = (0.5 + Math.random() * 0.8) * Math.min(1.8, boost)
  particles.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.2,
    life: 1,
    maxLife: 0.5 + Math.random() * 0.5,
    r, g, b,
    size: 2 + Math.random() * 2.5,
  })
  if (particles.length > 80) particles.splice(0, particles.length - 80)
}

export default function TouchParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const down = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const { color } = useAccent()
  const rgb = useRef(hexToRgb(color))

  useEffect(() => { rgb.current = hexToRgb(color) }, [color])

  const tick = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d", { alpha: true })
    if (!ctx) return

    ctx.clearRect(0, 0, c.width, c.height)

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.012
      p.life -= 0.025 / p.maxLife

      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      const alpha = p.life * 0.6
      const sz = p.size * (0.4 + p.life * 0.6)

      ctx.globalAlpha = alpha
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1

    if (particles.length > 0) {
      raf = requestAnimationFrame(tick)
    } else {
      raf = null
    }
  }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return

    const resize = () => {
      c.width = window.innerWidth
      c.height = window.innerHeight
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(document.documentElement)

    function onDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return
      down.current = true
      last.current = { x: e.clientX, y: e.clientY }
      const { r, g, b } = rgb.current
      for (let i = 0; i < 3; i++) spawn(e.clientX, e.clientY, r, g, b, 1)
      if (!raf) raf = requestAnimationFrame(tick)
    }

    function onMove(e: PointerEvent) {
      if (!down.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 4) return

      const { r, g, b } = rgb.current
      const boost = 0.5 + dist / 25
      const steps = Math.max(1, Math.floor(dist / 8))
      for (let i = 0; i < steps; i++) {
        const t = i / steps
        spawn(last.current.x + dx * t, last.current.y + dy * t, r, g, b, boost)
      }
      last.current = { x: e.clientX, y: e.clientY }
      if (!raf) raf = requestAnimationFrame(tick)
    }

    function onUp() { down.current = false }

    document.addEventListener("pointerdown", onDown, { capture: true })
    document.addEventListener("pointermove", onMove, { capture: true })
    document.addEventListener("pointerup", onUp, { capture: true })
    document.addEventListener("pointercancel", onUp, { capture: true })

    return () => {
      ro.disconnect()
      document.removeEventListener("pointerdown", onDown, { capture: true })
      document.removeEventListener("pointermove", onMove, { capture: true })
      document.removeEventListener("pointerup", onUp, { capture: true })
      document.removeEventListener("pointercancel", onUp, { capture: true })
      if (raf) cancelAnimationFrame(raf)
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
