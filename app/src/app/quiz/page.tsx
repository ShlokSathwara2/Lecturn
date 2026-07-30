"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi } from "@/lib/api"
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
        ctx!.fillStyle = "rgba(5,150,105,0.2)"
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
            ctx!.strokeStyle = `rgba(5,150,105,${0.05 * (1 - dist / 110)})`
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

export default function QuizPage() {
  const router = useRouter()
  const supabase = createClient()
  usePageAccent("#f59e0b")

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterNotesMap, setChapterNotesMap] = useState<Record<string, number>>({})
  const [selectedChapters, setSelectedChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingChapters, setLoadingChapters] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/auth"); return }
      try {
        const list = await subjectsApi.list(data.user.id)
        setSubjects(list)
      } catch {}
      setLoading(false)
    })
  }, [])

  async function selectSubject(subject: Subject) {
    setSelectedSubject(subject)
    setSelectedChapters([])
    setLoadingChapters(true)
    try {
      const chs = await chaptersApi.list(subject.id)
      setChapters(chs)
      const notesMap: Record<string, number> = {}
      for (const ch of chs) {
        const caps = await capturesApi.list(ch.id)
        notesMap[ch.id] = caps.length
      }
      setChapterNotesMap(notesMap)
    } catch {}
    setLoadingChapters(false)
  }

  function startQuiz() {
    if (selectedSubject) {
      const chapterIds = selectedChapters.map(c => c.id)
      const params = chapterIds.length > 0 ? `?chapters=${chapterIds.join(",")}` : ""
      router.push(`/quiz/${selectedSubject.id}${params}`)
    }
  }

  return (
    <main style={{ fontFamily: "var(--font-body)", minHeight: "100dvh", position: "relative" }} className="page-with-nav">
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-text {
          background: linear-gradient(135deg, #059669, #3b82f6);
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
            Quiz<span className="gradient-text">.</span>
          </h1>
          <motion.button onClick={() => router.push("/dashboard")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{ fontSize: 13, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a" }}>
            Back
          </motion.button>
        </motion.div>

        {loading && (
          <div style={{ textAlign: "center", padding: 32 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block", fontSize: 20, color: "#059669" }}>&#x21BB;</motion.div>
            <p style={{ fontSize: 14, color: "#909090", marginTop: 8 }}>Loading subjects...</p>
          </div>
        )}

        {!loading && subjects.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: 48, border: "1px dashed #2a2a2a", borderRadius: 12 }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>&#x1F9E0;</p>
            <p style={{ fontSize: 14, color: "#606060" }}>No subjects yet. Create some notes first!</p>
            <motion.button onClick={() => router.push("/capture")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ marginTop: 12, padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 14, fontWeight: 500 }}>
              Capture a slide
            </motion.button>
          </motion.div>
        )}

        {!loading && subjects.length > 0 && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#059669", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                Step 1: Select a subject
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {subjects.map((s, i) => (
                  <motion.button key={s.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.01, borderColor: selectedSubject?.id === s.id ? "#059669" : "rgba(5,150,105,0.3)" }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => selectSubject(s)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, background: selectedSubject?.id === s.id ? "rgba(5,150,105,0.1)" : "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: `1px solid ${selectedSubject?.id === s.id ? "rgba(5,150,105,0.4)" : "#2a2a2a"}`, cursor: "pointer", transition: "all 0.2s ease", textAlign: "left", width: "100%" }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: selectedSubject?.id === s.id ? "#059669" : "#e8e8e8" }}>{s.name}</span>
                    {selectedSubject?.id === s.id && <span style={{ color: "#059669" }}>&#10003;</span>}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <AnimatePresence>
              {selectedSubject && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }} style={{ overflow: "hidden" }}>
                  <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                    Step 2: Select chapters (optional, multi-select)
                  </p>
                  {loadingChapters ? (
                    <div style={{ textAlign: "center", padding: 16 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ display: "inline-block", fontSize: 16, color: "#3b82f6" }}>&#x21BB;</motion.div>
                    </div>
                  ) : chapters.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#606060", padding: "8px 0" }}>No chapters yet. The quiz will use all notes from this subject.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {chapters.map((ch, i) => (
                        <motion.button key={ch.id}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          whileHover={{ scale: 1.01, borderColor: "rgba(59,130,246,0.3)" }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            const isSelected = selectedChapters.some(c => c.id === ch.id)
                            setSelectedChapters(isSelected
                              ? selectedChapters.filter(c => c.id !== ch.id)
                              : [...selectedChapters, ch]
                            )
                          }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: selectedChapters.some(c => c.id === ch.id) ? "rgba(59,130,246,0.08)" : "rgba(26,26,26,0.5)", border: `1px solid ${selectedChapters.some(c => c.id === ch.id) ? "rgba(59,130,246,0.3)" : "#2a2a2a"}`, cursor: "pointer", transition: "all 0.2s ease", textAlign: "left", width: "100%" }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 500, color: "#e8e8e8" }}>{ch.title}</span>
                              <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                                {chapterNotesMap[ch.id] || 0} note{(chapterNotesMap[ch.id] || 0) !== 1 ? "s" : ""}
                              </p>
                            </div>
                            {selectedChapters.some(c => c.id === ch.id) && <span style={{ color: "#3b82f6", fontSize: 13 }}>&#10003;</span>}
                        </motion.button>
                      ))}
                    </div>
                  )}

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    style={{ marginTop: 16 }}>
                    <motion.button onClick={startQuiz} whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(5,150,105,0.3)" }} whileTap={{ scale: 0.98 }}
                      style={{ width: "100%", padding: "16px 24px", borderRadius: 12, background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                      Start Quiz &rarr;
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </main>
  )
}
