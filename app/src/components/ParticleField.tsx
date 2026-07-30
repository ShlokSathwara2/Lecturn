"use client"

import { useEffect, useRef } from "react"

interface ParticleFieldProps {
  color?: string
  dotCount?: number
  connectionDistance?: number
}

export default function ParticleField({ color = "59,130,246", dotCount = 30, connectionDistance = 110 }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return

    let w = (c.width = innerWidth)
    let h = (c.height = innerHeight)
    let mouseX = -1000
    let mouseY = -1000
    let mouseActive = false

    const dots: { x: number; y: number; vx: number; vy: number; r: number }[] = []
    for (let i = 0; i < dotCount; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1 + 0.3,
      })
    }

    function onPointerMove(e: PointerEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      mouseActive = true
    }

    function onPointerLeave() {
      mouseActive = false
      mouseX = -1000
      mouseY = -1000
    }

    function onPointerDown(e: PointerEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      mouseActive = true
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("pointerleave", onPointerLeave)

    let id: number
    function draw() {
      ctx!.fillStyle = "rgba(18,18,18,0.12)"
      ctx!.fillRect(0, 0, w, h)

      for (const d of dots) {
        if (mouseActive) {
          const dx = mouseX - d.x
          const dy = mouseY - d.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 200) {
            const force = (200 - dist) / 200
            d.vx += (dx / dist) * force * 0.3
            d.vy += (dy / dist) * force * 0.3
          }
        }

        d.vx *= 0.98
        d.vy *= 0.98
        d.x += d.vx
        d.y += d.vy

        if (d.x < 0 || d.x > w) d.vx *= -1
        if (d.y < 0 || d.y > h) d.vy *= -1

        ctx!.beginPath()
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${color},0.2)`
        ctx!.fill()
      }

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectionDistance) {
            ctx!.beginPath()
            ctx!.moveTo(dots[i].x, dots[i].y)
            ctx!.lineTo(dots[j].x, dots[j].y)
            ctx!.strokeStyle = `rgba(${color},${0.05 * (1 - dist / connectionDistance)})`
            ctx!.lineWidth = 0.3
            ctx!.stroke()
          }
        }

        if (mouseActive) {
          const dx = mouseX - dots[i].x
          const dy = mouseY - dots[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 180) {
            ctx!.beginPath()
            ctx!.moveTo(dots[i].x, dots[i].y)
            ctx!.lineTo(mouseX, mouseY)
            ctx!.strokeStyle = `rgba(${color},${0.15 * (1 - dist / 180)})`
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        }
      }

      id = requestAnimationFrame(draw)
    }
    draw()

    const ro = () => {
      w = c.width = innerWidth
      h = c.height = innerHeight
    }
    window.addEventListener("resize", ro)

    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("resize", ro)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("pointerleave", onPointerLeave)
    }
  }, [color, dotCount, connectionDistance])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  )
}
