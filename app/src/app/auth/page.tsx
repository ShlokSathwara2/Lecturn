"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

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
    for (let i = 0; i < 50; i++) {
      dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.3 + 0.4 })
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
        ctx!.fillStyle = "rgba(59,130,246,0.25)"
        ctx!.fill()
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx!.beginPath()
            ctx!.moveTo(dots[i].x, dots[i].y)
            ctx!.lineTo(dots[j].x, dots[j].y)
            ctx!.strokeStyle = `rgba(59,130,246,${0.07 * (1 - dist / 130)})`
            ctx!.lineWidth = 0.4
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

function AnimatedOrbs() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <motion.div animate={{ x: [0, 40, -20, 0], y: [0, -50, 30, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", top: "5%", left: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)" }} />
      <motion.div animate={{ x: [0, -30, 40, 0], y: [0, 40, -20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }} />
      <motion.div animate={{ x: [0, 20, -30, 0], y: [0, -30, 40, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", top: "60%", left: "50%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(5,150,105,0.04) 0%, transparent 70%)" }} />
    </div>
  )
}

function FloatingShapes() {
  const shapes = [
    { size: 50, x: "12%", y: "18%", rotate: 45, delay: 0 },
    { size: 35, x: "82%", y: "28%", rotate: 30, delay: 2 },
    { size: 45, x: "72%", y: "72%", rotate: 60, delay: 4 },
    { size: 30, x: "22%", y: "78%", rotate: 15, delay: 1 },
    { size: 40, x: "88%", y: "55%", rotate: 90, delay: 3 },
  ]
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {shapes.map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.3, 0], y: [0, -15, 0], rotate: [s.rotate, s.rotate + 8, s.rotate] }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          style={{ position: "absolute", left: s.x, top: s.y, width: s.size, height: s.size, border: "1px solid rgba(59,130,246,0.12)", borderRadius: s.size * 0.3 }} />
      ))}
    </div>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        router.push("/dashboard")
      } else {
        setSuccess("Account created! Check your email for a confirmation link.")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError("Invalid email or password. If you signed up with magic link before, use 'Forgot password' to set a password.")
      } else {
        router.push("/dashboard")
      }
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "#e8e8e8", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #059669);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 4s ease infinite;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #e8e8e8;
          -webkit-box-shadow: 0 0 0px 1000px #1a1a1a inset;
        }
      `}</style>

      <ParticleField />
      <AnimatedOrbs />
      <FloatingShapes />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        <div style={{ padding: "40px 32px", borderRadius: 20, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(59,130,246,0.1)" }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#3b82f6", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
              SlideScribe
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ color: "#909090", fontSize: 14, marginBottom: 32 }}>
              {mode === "signin" ? "Sign in to access your lecture notes." : "Start converting lectures into notes."}
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
              <label style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#606060", marginBottom: 6, display: "block", letterSpacing: "0.06em" }}>Email</label>
              <motion.input
                type="email" placeholder="you@university.edu" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                whileFocus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" }}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 16, color: "#e8e8e8", outline: "none", boxSizing: "border-box", transition: "all 0.2s ease" }} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
              <label style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#606060", marginBottom: 6, display: "block", letterSpacing: "0.06em" }}>Password</label>
              <div style={{ position: "relative" }}>
                <motion.input
                  type={showPassword ? "text" : "password"} placeholder="At least 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  whileFocus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" }}
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 16, color: "#e8e8e8", outline: "none", boxSizing: "border-box", transition: "all 0.2s ease", paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#606060", cursor: "pointer", fontSize: 18, padding: 4 }}>
                  {showPassword ? "\uD83D\uDC41" : "\uD83D\uDC41\u200D\uD83D\uDFE8"}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {mode === "signup" && (
                <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                  <label style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#606060", marginBottom: 6, display: "block", letterSpacing: "0.06em" }}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <motion.input
                      type={showConfirm ? "text" : "password"} placeholder="Re-enter your password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6}
                      whileFocus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" }}
                      style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 16, color: "#e8e8e8", outline: "none", boxSizing: "border-box", transition: "all 0.2s ease", paddingRight: 48 }} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#606060", cursor: "pointer", fontSize: 18, padding: 4 }}>
                      {showConfirm ? "\uD83D\uDC41" : "\uD83D\uDC41\u200D\uD83D\uDFE8"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -5, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -5, height: 0 }}
                  style={{ color: "#ef4444", fontSize: 13, fontFamily: "var(--font-mono)", padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.p initial={{ opacity: 0, y: -5, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -5, height: 0 }}
                  style={{ color: "#059669", fontSize: 13, fontFamily: "var(--font-mono)", padding: "10px 14px", borderRadius: 10, background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.15)" }}>
                  {success}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(59,130,246,0.3)" }} whileTap={{ scale: 0.98 }}
                style={{ width: "100%", padding: "14px 24px", borderRadius: 12, background: loading ? "#1a3a5a" : "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, transition: "all 0.3s ease" }}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block" }}>&#x21BB;</motion.span>
                    {mode === "signin" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : mode === "signin" ? "Sign In" : "Create Account"}
              </motion.button>
            </motion.div>
          </form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSuccess("") }}
              style={{ background: "transparent", border: "none", color: "#3b82f6", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
              {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            {mode === "signin" && (
              <button type="button" onClick={async () => {
                if (!email) { setError("Enter your email first"); return }
                setLoading(true); setError("")
                const { error } = await supabase.auth.resetPasswordForEmail(email)
                setLoading(false)
                if (error) setError(error.message)
                else setSuccess("Password reset link sent to your email")
              }} style={{ background: "transparent", border: "none", color: "#606060", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                Forgot password?
              </button>
            )}
          </motion.div>
        </div>

        <motion.button onClick={() => router.push("/")} whileHover={{ x: -3 }}
          style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, padding: "10px 0", background: "transparent", border: "none", color: "#606060", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
          &larr; Back to home
        </motion.button>
      </motion.div>
    </div>
  )
}
