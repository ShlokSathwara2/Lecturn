"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi } from "@/lib/api"
import { motion } from "framer-motion"
import { usePageAccent } from "@/lib/AccentContext"
import { useTheme } from "@/lib/ThemeContext"

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    let w = c.width = innerWidth
    let h = c.height = innerHeight
    const dots: { x: number; y: number; vx: number; vy: number; r: number }[] = []
    for (let i = 0; i < 30; i++) {
      dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, r: Math.random() * 1 + 0.3 })
    }
    let id: number
    function draw() {
      ctx!.fillStyle = "rgba(18,18,18,0.12)"
      ctx!.fillRect(0, 0, w, h)
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0 || d.x > w) d.vx *= -1
        if (d.y < 0 || d.y > h) d.vy *= -1
        ctx!.beginPath()
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx!.fillStyle = "rgba(59,130,246,0.2)"
        ctx!.fill()
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx!.beginPath()
            ctx!.moveTo(dots[i].x, dots[i].y)
            ctx!.lineTo(dots[j].x, dots[j].y)
            ctx!.strokeStyle = `rgba(59,130,246,${0.05 * (1 - dist / 110)})`
            ctx!.lineWidth = 0.3
            ctx!.stroke()
          }
        }
      }
      id = requestAnimationFrame(draw)
    }
    draw()
    const ro = () => { w = c.width = innerWidth; h = c.height = innerHeight }
    addEventListener("resize", ro)
    return () => { cancelAnimationFrame(id); removeEventListener("resize", ro) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  usePageAccent("#ec4899")
  const { theme, toggle } = useTheme()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ subjects: 0, chapters: 0, captures: 0 })
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/auth"); return }
      setUser(data.user)

      try {
        const subjects = await subjectsApi.list(data.user.id)
        let chapters = 0
        let captures = 0
        for (const s of subjects) {
          const chs = await chaptersApi.list(s.id)
          chapters += chs.length
          for (const ch of chs) {
            const caps = await capturesApi.list(ch.id)
            captures += caps.length
          }
        }
        setStats({ subjects: subjects.length, chapters, captures })
      } catch {}

      setLoading(false)
    })
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push("/auth")
  }

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : ""

  return (
    <main style={{ fontFamily: "var(--font-body)", minHeight: "100dvh", position: "relative" }} className="page-with-nav">
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 4s ease infinite;
        }
      `}</style>

      <ParticleField />

      <div style={{ position: "relative", zIndex: 1, padding: 16, maxWidth: 500, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh" }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            Profile<span className="gradient-text">.</span>
          </h1>
          <motion.button onClick={() => router.push("/dashboard")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{ fontSize: 13, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a" }}>
            Back
          </motion.button>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block", fontSize: 20, color: "#3b82f6" }}>&#x21BB;</motion.div>
            <p style={{ fontSize: 14, color: "#909090", marginTop: 8 }}>Loading profile...</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <motion.div variants={itemVariants}
              style={{ padding: "24px 20px", borderRadius: 16, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(12px)", border: "1px solid #2a2a2a", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, fontWeight: 700, color: "#fff" }}>
                {user?.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#e8e8e8", marginBottom: 4 }}>{user?.email || "Unknown"}</p>
              <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#606060" }}>Member since {memberSince}</p>
            </motion.div>

            <motion.div variants={itemVariants}
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: "Subjects", value: stats.subjects, color: "#3b82f6" },
                { label: "Chapters", value: stats.chapters, color: "#8b5cf6" },
                { label: "Notes", value: stats.captures, color: "#059669" },
              ].map((s, i) => (
                <div key={i} style={{ padding: "20px 12px", borderRadius: 14, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(12px)", border: "1px solid #2a2a2a", textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#606060", marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants}
              style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { label: "Dashboard", action: () => router.push("/dashboard") },
                { label: "Capture", action: () => router.push("/capture") },
                { label: "Notes", action: () => router.push("/notes") },
                { label: "Quiz", action: () => router.push("/quiz") },
              ].map((item, i) => (
                <motion.button key={i} onClick={item.action} whileHover={{ x: 4, borderColor: "rgba(59,130,246,0.3)" }} whileTap={{ scale: 0.98 }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: "1px solid #2a2a2a", cursor: "pointer", fontSize: 15, color: "#e8e8e8", transition: "all 0.2s ease" }}>
                  <span>{item.label}</span>
                  <span style={{ color: "#606060" }}>&rarr;</span>
                </motion.button>
              ))}
            </motion.div>

            <motion.div variants={itemVariants}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: "1px solid #2a2a2a" }}>
              <span style={{ fontSize: 15, color: "#e8e8e8" }}>Theme</span>
              <motion.button onClick={toggle} whileTap={{ scale: 0.9 }}
                style={{ padding: "6px 14px", borderRadius: 8, background: theme === "dark" ? "#3b82f6" : "#f59e0b", color: "#fff", fontSize: 13, fontWeight: 500 }}>
                {theme === "dark" ? "Dark" : "Light"}
              </motion.button>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.button onClick={handleSignOut} disabled={signingOut}
                whileHover={{ scale: 1.02, borderColor: "rgba(239,68,68,0.4)" }} whileTap={{ scale: 0.98 }}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 15, fontWeight: 500, opacity: signingOut ? 0.6 : 1, transition: "all 0.2s ease" }}>
                {signingOut ? "Signing out..." : "Sign out"}
              </motion.button>
            </motion.div>

          </motion.div>
        )}
      </div>
    </main>
  )
}
