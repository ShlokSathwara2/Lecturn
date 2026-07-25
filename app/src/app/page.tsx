"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { motion, useInView } from "framer-motion"

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
    for (let i = 0; i < 60; i++) {
      dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.5 + 0.5 })
    }
    let id: number
    function draw() {
      ctx!.fillStyle = "rgba(18,18,18,0.15)"
      ctx!.fillRect(0, 0, w, h)
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0 || d.x > w) d.vx *= -1
        if (d.y < 0 || d.y > h) d.vy *= -1
        ctx!.beginPath()
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx!.fillStyle = "rgba(59,130,246,0.3)"
        ctx!.fill()
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx!.beginPath()
            ctx!.moveTo(dots[i].x, dots[i].y)
            ctx!.lineTo(dots[j].x, dots[j].y)
            ctx!.strokeStyle = `rgba(59,130,246,${0.08 * (1 - dist / 150)})`
            ctx!.lineWidth = 0.5
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
      <motion.div animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)" }} />
      <motion.div animate={{ x: [0, -40, 30, 0], y: [0, 50, -30, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", bottom: "15%", right: "8%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }} />
      <motion.div animate={{ x: [0, 20, -30, 0], y: [0, -30, 40, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", top: "50%", left: "60%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(5,150,105,0.05) 0%, transparent 70%)" }} />
    </div>
  )
}

function FloatingShapes() {
  const shapes = [
    { size: 60, x: "15%", y: "20%", rotate: 45, delay: 0 },
    { size: 40, x: "80%", y: "30%", rotate: 30, delay: 2 },
    { size: 50, x: "70%", y: "70%", rotate: 60, delay: 4 },
    { size: 35, x: "25%", y: "75%", rotate: 15, delay: 1 },
    { size: 45, x: "90%", y: "55%", rotate: 90, delay: 3 },
  ]
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {shapes.map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0], y: [0, -20, 0], rotate: [s.rotate, s.rotate + 10, s.rotate] }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          style={{ position: "absolute", left: s.x, top: s.y, width: s.size, height: s.size, border: "1px solid rgba(59,130,246,0.15)", borderRadius: s.size * 0.3 }} />
      ))}
    </div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
}

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay, ease: "easeOut" }}>
      {children}
    </motion.div>
  )
}

const features = [
  { title: "Snap & Go", desc: "Photograph lecture slides instantly. Perspective correction enhances readability before AI extraction." },
  { title: "AI Vision OCR", desc: "Extracts every word, diagram, and formula from slides using multi-model AI (Gemini + OpenRouter fallback)." },
  { title: "Smart Enrichment", desc: "Converts raw text into exam-oriented study notes, summaries, easy explanations, or diagram breakdowns." },
  { title: "AI Study Guides", desc: "Generate comprehensive combined notes for an entire subject — with diagrams, flowcharts, and key definitions." },
  { title: "Voice Notes", desc: "Record audio alongside slides. Transcribed automatically via Whisper and synced to your notes." },
  { title: "Dark & Light Mode", desc: "Toggle between dark and light themes. Each page adapts its accent color for a fluid, cohesive feel." },
  { title: "Search & Organize", desc: "Keyword and semantic search across all notes. Auto-detect chapters, pin favorites, and organize by subject." },
  { title: "Export Anywhere", desc: "Export as PDF, DOCX, RTF, TXT, Evernote, Samsung Notes, or Apple Notes — with or without images." },
  { title: "Quiz Yourself", desc: "AI-generated flashcards from your notes. Test retention and identify gaps in your understanding." },
]

const steps = [
  { num: "01", title: "Capture", desc: "Take a photo of your lecture slide or type a note." },
  { num: "02", title: "Process", desc: "AI extracts text, identifies diagrams, and enriches content." },
  { num: "03", title: "Study", desc: "Generate combined study guides, pin key notes, quiz yourself." },
  { num: "04", title: "Export", desc: "Download as PDF, DOCX, or send directly to Samsung/Apple Notes." },
]

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  if (loading) return null

  if (user) {
    router.push("/dashboard")
    return null
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "#e8e8e8", overflow: "hidden" }}>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .glow-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .glow-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(59,130,246,0.3);
        }
        .glow-btn:active {
          transform: translateY(0);
        }
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #059669);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 4s ease infinite;
        }
        .card-hover {
          transition: all 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          border-color: rgba(59,130,246,0.3);
          box-shadow: 0 8px 30px rgba(59,130,246,0.1);
        }
        html { scroll-behavior: smooth; }
      `}</style>

      <ParticleField />
      <AnimatedOrbs />
      <FloatingShapes />

      {/* ── Hero ── */}
      <section style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "24px", position: "relative", zIndex: 1, textAlign: "center" }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ maxWidth: 640 }}>
          <motion.div variants={itemVariants} style={{ marginBottom: 24 }}>
            <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: "0 auto", display: "block" }}>
              <defs>
                <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a5f"/>
                  <stop offset="30%" stopColor="#2563eb"/>
                  <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
                <linearGradient id="lg2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0f172a"/>
                  <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9"/>
                </linearGradient>
                <linearGradient id="lg3" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#1e40af"/>
                </linearGradient>
              </defs>
              <polygon points="60,180 60,60 90,45 90,180" fill="url(#lg1)" opacity="0.95"/>
              <polygon points="140,180 140,60 110,45 110,180" fill="url(#lg2)" opacity="0.9"/>
              <polygon points="40,55 100,25 160,55 100,75" fill="url(#lg1)" opacity="0.85"/>
              <polygon points="40,55 100,25 80,20 30,48" fill="#1e3a5f" opacity="0.7"/>
              <polygon points="160,55 100,25 120,20 170,48" fill="#06b6d4" opacity="0.6"/>
              <polygon points="100,65 120,90 100,115 80,90" fill="url(#lg3)" opacity="0.85"/>
            </svg>
          </motion.div>
          <motion.div variants={itemVariants} style={{ fontSize: 14, fontFamily: "var(--font-mono)", color: "#3b82f6", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
            AI-Powered Lecture Notes
          </motion.div>
          <motion.h1 variants={itemVariants} style={{ fontSize: "clamp(40px, 8vw, 72px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 20 }}>
            Your Lectures,<br />
            <span className="gradient-text">Supercharged</span>
          </motion.h1>
          <motion.p variants={itemVariants} style={{ fontSize: 17, color: "#909090", lineHeight: 1.7, marginBottom: 36, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Snap a photo of any slide. AI extracts text, diagrams, and generates comprehensive study guides — enriched, searchable, and exportable.
          </motion.p>
          <motion.div variants={itemVariants} style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <motion.button onClick={() => router.push("/auth")} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="glow-btn"
              style={{ padding: "16px 36px", borderRadius: 14, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer" }}>
              Get Started Free
            </motion.button>
            <motion.button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ padding: "16px 36px", borderRadius: 14, background: "transparent", color: "#e8e8e8", fontSize: 16, fontWeight: 500, border: "1px solid #2a2a2a", cursor: "pointer" }}>
              Learn More
            </motion.button>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
          style={{ position: "absolute", bottom: 32, fontSize: 24, color: "#3b82f6", animation: "bounce 2s infinite" }}>
          <style>{`@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }`}</style>
          &darr;
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeInSection>
            <p style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center", marginBottom: 8 }}>Features</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, textAlign: "center", marginBottom: 48 }}>
              Everything you need to <span className="gradient-text">master your lectures</span>
            </h2>
          </FadeInSection>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {features.map((f, i) => (
              <FadeInSection key={i} delay={i * 0.08}>
                <motion.div whileHover={{ y: -4 }} className="card-hover"
                  style={{ padding: "24px 20px", borderRadius: 16, background: "rgba(26,26,26,0.6)", backdropFilter: "blur(8px)", border: "1px solid #2a2a2a", cursor: "default" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: "#909090", lineHeight: 1.6 }}>{f.desc}</p>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <FadeInSection>
            <p style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center", marginBottom: 8 }}>Workflow</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, textAlign: "center", marginBottom: 48 }}>
              From slide to study notes in <span className="gradient-text">seconds</span>
            </h2>
          </FadeInSection>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((s, i) => (
              <FadeInSection key={i} delay={i * 0.12}>
                <motion.div whileHover={{ x: 4 }} style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "20px 24px", borderRadius: 14, background: "rgba(26,26,26,0.4)", border: "1px solid #2a2a2a" }}>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#3b82f6", fontWeight: 600, minWidth: 32 }}>{s.num}</div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{s.title}</h3>
                    <p style={{ fontSize: 14, color: "#909090", lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 1, textAlign: "center" }}>
        <FadeInSection>
          <motion.div style={{ maxWidth: 500, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, marginBottom: 16 }}>
              Ready to transform your study routine?
            </h2>
            <p style={{ fontSize: 15, color: "#909090", lineHeight: 1.7, marginBottom: 32 }}>
              Join thousands of students who never miss a detail from their lectures.
            </p>
            <motion.button onClick={() => router.push("/auth")} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="glow-btn"
              style={{ padding: "18px 44px", borderRadius: 14, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 17, fontWeight: 600, border: "none", cursor: "pointer" }}>
              Start Now &rarr;
            </motion.button>
          </motion.div>
        </FadeInSection>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "32px 24px", position: "relative", zIndex: 1, borderTop: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="24" height="24" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 4 }}>
              <polygon points="60,180 60,60 90,45 90,180" fill="#2563eb" opacity="0.95"/>
              <polygon points="140,180 140,60 110,45 110,180" fill="#1d4ed8" opacity="0.9"/>
              <polygon points="40,55 100,25 160,55 100,75" fill="#2563eb" opacity="0.85"/>
              <polygon points="100,65 120,90 100,115 80,90" fill="#38bdf8" opacity="0.85"/>
            </svg>
            <p style={{ fontSize: 13, color: "#606060", fontFamily: "var(--font-mono)" }}>Lecturn &mdash; AI Lecture Notes</p>
          </div>
          <button onClick={() => router.push("/auth")} style={{ fontSize: 13, color: "#909090", padding: "8px 16px", borderRadius: 8, border: "1px solid #2a2a2a", background: "transparent", cursor: "pointer" }}>
            Sign In
          </button>
        </div>
      </footer>
    </div>
  )
}
