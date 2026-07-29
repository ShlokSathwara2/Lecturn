"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi, aiNotes } from "@/lib/api"

interface Subject { id: string; name: string }
interface Chapter { id: string; title: string }
interface Capture { id: string; ai_status: string }

interface Props {
  userId: string
  onDone?: () => void
}

export default function BatchAIGeneration({ userId, onDone }: Props) {
  const [open, setOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [slideCounts, setSlideCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState("")
  const [result, setResult] = useState<{ id: string; topicCount: number; slidesAnalyzed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadSubjects() {
    const list = await subjectsApi.list(userId)
    setSubjects(list)
  }

  async function selectSubject(subject: Subject) {
    setSelectedSubject(subject)
    setLoading(true)
    setError(null)
    try {
      const chs = await chaptersApi.list(subject.id)
      setChapters(chs)
      const counts: Record<string, number> = {}
      const capResults = await Promise.all(
        chs.map((ch: Chapter) => capturesApi.list(ch.id).then((caps: any[]) => ({ id: ch.id, count: caps.length })))
      )
      capResults.forEach((res) => {
        counts[res.id] = res.count
      })
      setSlideCounts(counts)
    } catch {
      setError("Failed to load chapters")
    }
    setLoading(false)
  }

  async function generateNotes() {
    if (!selectedSubject) return
    setGenerating(true)
    setProgress("Reading all slides...")
    setError(null)
    try {
      setProgress("Combining content across all chapters...")
      const res = await aiNotes.generate(selectedSubject.id, userId)
      setProgress("Done!")
      setResult({
        id: res.id,
        topicCount: res.topic_count,
        slidesAnalyzed: res.total_slides_analyzed,
      })
      onDone?.()
    } catch (e: any) {
      setError(e.message || "Generation failed. Try again.")
    }
    setGenerating(false)
  }

  function handleOpen() {
    setOpen(true)
    setSelectedSubject(null)
    setChapters([])
    setResult(null)
    setError(null)
    setProgress("")
    loadSubjects()
  }

  const totalSlides = Object.values(slideCounts).reduce((a, b) => a + b, 0)

  return (
    <>
      <motion.button onClick={handleOpen} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6", fontSize: 13, fontWeight: 500 }}>
        Generate AI Notes
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto" }}>

              {!result ? (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                    {selectedSubject ? selectedSubject.name : "Generate AI Notes"}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
                    {selectedSubject
                      ? "Combine all slides into one comprehensive study guide"
                      : "Pick a subject to generate combined notes for"}
                  </p>

                  {!selectedSubject && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {subjects.map((s) => (
                        <motion.button key={s.id} onClick={() => selectSubject(s)} whileHover={{ x: 4 }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                          <span>{s.name}</span>
                          <span style={{ color: "var(--color-text-secondary)" }}>&rarr;</span>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {selectedSubject && !generating && (
                    <>
                      {loading && (
                        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", padding: 16 }}>Scanning chapters...</p>
                      )}

                      {!loading && totalSlides === 0 && (
                        <div style={{ textAlign: "center", padding: 20 }}>
                          <p style={{ fontSize: 24, marginBottom: 8 }}>&#128221;</p>
                          <p style={{ fontSize: 14, color: "var(--color-text)" }}>No slides captured yet!</p>
                          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>Capture some slides first, then come back to generate notes.</p>
                        </div>
                      )}

                      {!loading && totalSlides > 0 && (
                        <>
                          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>{chapters.length} chapters, {totalSlides} slides</p>
                            {chapters.map((ch) => (
                              <div key={ch.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
                                <span>{ch.title}</span>
                                <span style={{ fontFamily: "var(--font-mono)" }}>{slideCounts[ch.id] || 0} slides</span>
                              </div>
                            ))}
                          </div>

                          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                            The AI will read every slide, combine the content, and produce a single study guide with diagrams, flowcharts, key definitions, and a quick reference card.
                          </p>

                          {error && (
                            <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 12, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.1)" }}>{error}</p>
                          )}

                          <div style={{ display: "flex", gap: 8 }}>
                            <motion.button onClick={() => setSelectedSubject(null)} whileTap={{ scale: 0.98 }}
                              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontSize: 14 }}>
                              Back
                            </motion.button>
                            <motion.button onClick={generateNotes} whileTap={{ scale: 0.98 }}
                              style={{ flex: 2, padding: "12px", borderRadius: 10, background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", color: "#fff", fontSize: 14, fontWeight: 500 }}>
                              Generate Study Guide
                            </motion.button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {generating && (
                    <div style={{ textAlign: "center", padding: 20 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        style={{ display: "inline-block", fontSize: 28, marginBottom: 12 }}>&#x21BB;</motion.div>
                      <p style={{ fontSize: 14, color: "var(--color-text)", marginBottom: 4 }}>Generating your study guide...</p>
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{progress}</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 16 }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>&#x2728;</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>Study guide ready!</p>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
                    Analyzed {result.slidesAnalyzed} slides across {result.topicCount} topics
                  </p>
                  <motion.button onClick={() => { setOpen(false); onDone?.() }} whileTap={{ scale: 0.98 }}
                    style={{ padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", color: "#fff", fontSize: 14, fontWeight: 500 }}>
                    View in Notes
                  </motion.button>
                </div>
              )}

              <motion.button onClick={() => setOpen(false)} whileTap={{ scale: 0.98 }}
                style={{ marginTop: 12, width: "100%", padding: "10px", borderRadius: 10, border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontSize: 13 }}>
                {result ? "Close" : "Cancel"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
