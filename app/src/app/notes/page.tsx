"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi, aiNotes } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { usePageAccent } from "@/lib/AccentContext"

interface Subject { id: string; name: string }
interface Chapter { id: string; subject_id: string; title: string; created_at: string }

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
    for (let i = 0; i < 35; i++) {
      dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, r: Math.random() * 1.2 + 0.3 })
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
        ctx!.fillStyle = "rgba(139,92,246,0.2)"
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
            ctx!.strokeStyle = `rgba(139,92,246,${0.06 * (1 - dist / 110)})`
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
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
}

export default function NotesPage() {
  const router = useRouter()
  const supabase = createClient()
  usePageAccent("#8b5cf6")

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<string, Chapter[]>>({})
  const [chapterNotesCount, setChapterNotesCount] = useState<Record<string, number>>({})
  const [aiNotesExist, setAiNotesExist] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth"); return }
      loadSubjects(data.user.id)
    })
  }, [])

  async function loadSubjects(userId: string) {
    setLoading(true)
    try {
      const list = await subjectsApi.list(userId)
      setSubjects(list)
    } catch {}
    setLoading(false)
  }

  async function toggleSubject(subjectId: string) {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null)
      return
    }
    setExpandedSubject(subjectId)
    if (!chaptersBySubject[subjectId]) {
      try {
        const chs = await chaptersApi.list(subjectId)
        setChaptersBySubject((prev) => ({ ...prev, [subjectId]: chs }))

        const counts: Record<string, number> = {}
        const capResults = await Promise.all(
          chs.map((ch: Chapter) => capturesApi.list(ch.id).then((caps: any[]) => ({ id: ch.id, count: caps.length })))
        )
        capResults.forEach((res) => {
          counts[res.id] = res.count
        })
        setChapterNotesCount((prev) => ({ ...prev, ...counts }))

        try {
          await aiNotes.get(subjectId)
          setAiNotesExist((prev) => ({ ...prev, [subjectId]: true }))
        } catch {
          setAiNotesExist((prev) => ({ ...prev, [subjectId]: false }))
        }
      } catch {}
    }
  }

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main style={{ fontFamily: "var(--font-body)", minHeight: "100dvh", position: "relative" }} className="page-with-nav">
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-text {
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 4s ease infinite;
        }
      `}</style>

      <ParticleField />

      <div style={{ position: "relative", zIndex: 1, padding: 16, maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh" }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            Notes<span className="gradient-text">.</span>
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button onClick={() => router.push("/dashboard")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ fontSize: 13, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a" }}>
              Dashboard
            </motion.button>
            <motion.button onClick={() => router.push("/capture")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ fontSize: 13, color: "#e8e8e8", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", background: "rgba(59,130,246,0.1)" }}>
              Capture
            </motion.button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ position: "relative" }}>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects..."
            style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 10, border: "1px solid #2a2a2a", background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", fontSize: 14, color: "#e8e8e8", outline: "none" }} />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#606060" }}>&#128269;</span>
        </motion.div>

        {loading && (
          <div style={{ textAlign: "center", padding: 32 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block", fontSize: 20, color: "#8b5cf6" }}>&#x21BB;</motion.div>
            <p style={{ fontSize: 14, color: "#909090", marginTop: 8 }}>Loading notes...</p>
          </div>
        )}

        {!loading && filteredSubjects.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: 48, border: "1px dashed #2a2a2a", borderRadius: 12 }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>&#128221;</p>
            <p style={{ fontSize: 14, color: "#606060" }}>
              {searchQuery ? "No subjects match your search." : "No notes yet. Capture a slide to get started."}
            </p>
            {!searchQuery && (
              <motion.button onClick={() => router.push("/capture")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ marginTop: 12, padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 14, fontWeight: 500 }}>
                Capture a slide
              </motion.button>
            )}
          </motion.div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredSubjects.map((s) => (
            <motion.div key={s.id} variants={itemVariants}>
              <motion.div
                whileHover={{ borderColor: "rgba(139,92,246,0.3)" }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRadius: 12, background: expandedSubject === s.id ? "rgba(139,92,246,0.08)" : "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: "1px solid #2a2a2a", cursor: "pointer", transition: "all 0.2s ease" }}
                onClick={() => toggleSubject(s.id)}>
                <motion.span animate={{ rotate: expandedSubject === s.id ? 90 : 0 }} transition={{ duration: 0.2 }}
                  style={{ fontSize: 12, color: expandedSubject === s.id ? "#8b5cf6" : "#606060" }}>
                  &#9654;
                </motion.span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#e8e8e8" }}>{s.name}</p>
                </div>
                <span style={{ fontSize: 12, color: "#606060", fontFamily: "var(--font-mono)" }}>
                  {(chaptersBySubject[s.id] || []).length} ch
                </span>
              </motion.div>

              <AnimatePresence>
                {expandedSubject === s.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 24, paddingTop: 4 }}>

                      {aiNotesExist[s.id] && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          onClick={() => router.push(`/notes/ai/${s.id}`)}
                          whileHover={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)" }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 8, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", cursor: "pointer", transition: "all 0.2s ease" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>&#x2728;</span>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "#8b5cf6" }}>AI Generated Notes</p>
                              <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                                Combined study guide
                              </p>
                            </div>
                          </div>
                          <span style={{ fontSize: 13, color: "#8b5cf6" }}>&rarr;</span>
                        </motion.div>
                      )}

                      {(chaptersBySubject[s.id] || []).length === 0 && !aiNotesExist[s.id] && (
                        <p style={{ fontSize: 13, color: "#606060", padding: "8px 0" }}>No chapters yet.</p>
                      )}
                      {(chaptersBySubject[s.id] || []).map((ch, i) => (
                        <motion.div key={ch.id}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          onClick={() => router.push(`/notes/${ch.id}`)}
                          whileHover={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.05)" }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 8, background: "rgba(26,26,26,0.5)", border: "1px solid #2a2a2a", cursor: "pointer", transition: "all 0.2s ease" }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e8e8" }}>{ch.title}</p>
                            <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                              {chapterNotesCount[ch.id] || 0} note{(chapterNotesCount[ch.id] || 0) !== 1 ? "s" : ""} &middot; {new Date(ch.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span style={{ fontSize: 13, color: "#909090" }}>&rarr;</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  )
}
