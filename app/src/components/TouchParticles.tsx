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
  color: string
  size: number
}

let activeParticles: Particle[] = []
let animFrame: number | null = null

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function spawnParticle(x: number, y: number, color: string, speedBoost: number = 1) {
  const angle = Math.random() * Math.PI * 2
  const speed = (0.4 + Math.random() * 1.0) * Math.min(2, speedBoost)
  const rgb = hexToRgb(color)
  activeParticles.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.3,
    life: 1,
    maxLife: 0.6 + Math.random() * 0.6,
    color: `rgba(${rgb.r},${rgb.g},${rgb.b},`,
    size: 2 + Math.random() * 3,
  })
}

export default function TouchParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerDown = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const { color } = useAccent()

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
      p.vy += 0.015
      p.life -= 0.02 / p.maxLife

      if (p.life <= 0) {
        activeParticles.splice(i, 1)
        continue
      }

      const alpha = Math.max(0, p.life * 0.7)
      const blur = (1 - p.life) * 6
      ctx.save()
      ctx.filter = `blur(${blur}px)`
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color + "0.9)"
      ctx.shadowColor = p.color + "0.5)"
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2)
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
      for (let i = 0; i < 3; i++) spawnParticle(e.clientX, e.clientY, color)
      if (!animFrame) animFrame = requestAnimationFrame(tick)
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointerDown.current) return
      const dx = e.clientX - lastPos.current.x
      const dy = e.clientY - lastPos.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      const spacing = 6
      const steps = Math.max(1, Math.floor(dist / spacing))
      const speedBoost = 0.6 + dist / 20
      for (let i = 0; i < steps; i++) {
        const t = i / steps
        spawnParticle(lastPos.current.x + dx * t, lastPos.current.y + dy * t, color, speedBoost)
      }
      lastPos.current = { x: e.clientX, y: e.clientY }
      if (!animFrame) animFrame = requestAnimationFrame(tick)
    }

    function onPointerUp() {
      pointerDown.current = false
    }

    document.addEventListener("pointerdown", onPointerDown, { capture: true })
    document.addEventListener("pointermove", onPointerMove, { capture: true })
    document.addEventListener("pointerup", onPointerUp, { capture: true })
    document.addEventListener("pointercancel", onPointerUp, { capture: true })

    return () => {
      window.removeEventListener("resize", resize)
      document.removeEventListener("pointerdown", onPointerDown, { capture: true })
      document.removeEventListener("pointermove", onPointerMove, { capture: true })
      document.removeEventListener("pointerup", onPointerUp, { capture: true })
      document.removeEventListener("pointercancel", onPointerUp, { capture: true })
      if (animFrame) cancelAnimationFrame(animFrame)
    }
  }, [tick, color])

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
