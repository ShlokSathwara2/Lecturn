"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

function AuthBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
      <motion.div animate={{ x: [0, 40, -20, 0], y: [0, -50, 30, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", top: "5%", left: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)" }} />
      <motion.div animate={{ x: [0, -30, 40, 0], y: [0, 40, -20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 0%, #121212 100%)" }} />
    </div>
  )
}

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "#e8e8e8", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
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
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #e8e8e8;
          -webkit-box-shadow: 0 0 0px 1000px #1a1a1a inset;
          caret-color: #e8e8e8;
        }
      `}</style>

      <AuthBackground />

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
            <div style={{ padding: "40px 32px", borderRadius: 20, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(59,130,246,0.15)", textAlign: "center" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>
                &#x2709;&#xFE0F;
              </motion.div>
              <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Check your email</h1>
              <p style={{ color: "#909090", lineHeight: 1.6, fontSize: 14 }}>
                We sent a magic link to <strong style={{ color: "#e8e8e8" }}>{email}</strong>.
                Click the link in the email to sign in.
              </p>
              <button onClick={() => { setSent(false); setEmail("") }}
                style={{ marginTop: 20, padding: "10px 20px", borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "#909090", fontSize: 13, cursor: "pointer" }}>
                Use a different email
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
            <div style={{ padding: "40px 32px", borderRadius: 20, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(59,130,246,0.1)" }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#3b82f6", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                  SlideScribe
                </p>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
                  Welcome back
                </h1>
                <p style={{ color: "#909090", fontSize: 14, marginBottom: 32 }}>
                  Enter your email to receive a <span className="gradient-text" style={{ fontWeight: 500 }}>magic link</span>
                </p>
              </motion.div>

              <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <label style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#606060", marginBottom: 6, display: "block" }}>
                    Email Address
                  </label>
                  <motion.input
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    whileFocus={{ borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" }}
                    style={{
                      width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #2a2a2a",
                      background: "#1a1a1a", fontSize: 16, color: "#e8e8e8", outline: "none",
                      boxSizing: "border-box", transition: "all 0.2s ease",
                    }} />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ color: "#ef4444", fontSize: 13, fontFamily: "var(--font-mono)", padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)" }}>
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: "100%", padding: "14px 24px", borderRadius: 12,
                      background: loading ? "#1a3a5a" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                      color: "#fff", fontSize: 16, fontWeight: 600, border: "none", cursor: loading ? "default" : "pointer",
                      opacity: loading ? 0.6 : 1, transition: "all 0.2s ease",
                    }}>
                    {loading ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block" }}>&#x21BB;</motion.span>
                        Sending...
                      </span>
                    ) : "Send Magic Link"}
                  </motion.button>
                </motion.div>
              </form>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                style={{ marginTop: 20, fontSize: 12, color: "#505050", textAlign: "center", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
                No password needed. We&apos;ll email you a secure sign-in link.
              </motion.p>
            </div>

            <motion.button
              onClick={() => router.push("/")}
              whileHover={{ x: -2 }}
              style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, padding: "10px 0", background: "transparent", border: "none", color: "#606060", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
              &larr; Back to home
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
