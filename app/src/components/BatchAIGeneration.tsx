"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi, processing } from "@/lib/api"

interface Subject { id: string; name: string }
interface Chapter { id: string; title: string }
interface Capture { id: string; ai_status: string; raw_text?: string }

interface Props {
  userId: string
  onDone?: () => void
}

export default function BatchAIGeneration({ userId, onDone }: Props) {
  const [open, setOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [uncaptured, setUncaptured] = useState<Record<string, Capture[]>>({})
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  async function loadSubjects() {
    const list = await subjectsApi.list(userId)
    setSubjects(list)
  }

  async function selectSubject(subjectId: string) {
    setSelectedSubject(subjectId)
    setLoading(true)
    const chs = await chaptersApi.list(subjectId)
    setChapters(chs)
    const unc: Record<string, Capture[]> = {}
    for (const ch of chs) {
      const caps = await capturesApi.list(ch.id)
      const needs = caps.filter((c: Capture) => c.ai_status === "not_generated" && c.raw_text)
      if (needs.length > 0) unc[ch.id] = needs
    }
    setUncaptured(unc)
    setLoading(false)
  }

  async function runBatch() {
    const allIds = Object.values(uncaptured).flat().map((c) => c.id)
    if (allIds.length === 0) return
    setProgress({ done: 0, total: allIds.length })
    setLoading(true)
    try {
      await processing.batch(allIds)
      setProgress({ done: allIds.length, total: allIds.length })
      setResult({ success: allIds.length, failed: 0 })
    } catch (e: any) {
      setResult({ success: 0, failed: allIds.length })
    }
    setLoading(false)
    onDone?.()
  }

  function handleOpen() {
    setOpen(true)
    setSelectedSubject(null)
    setChapters([])
    setUncaptured({})
    setResult(null)
    setProgress({ done: 0, total: 0 })
    loadSubjects()
  }

  const totalPending = Object.values(uncaptured).flat().length

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
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, maxHeight: "80vh", overflowY: "auto" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>Batch AI Generation</h3>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>Generate AI study notes for uncaptured slides</p>

              {!selectedSubject && !result && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {subjects.map((s) => (
                    <motion.button key={s.id} onClick={() => selectSubject(s.id)} whileHover={{ x: 4 }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                      <span>{s.name}</span>
                      <span style={{ color: "var(--color-text-secondary)" }}>&rarr;</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {selectedSubject && !result && (
                <>
                  {loading && totalPending === 0 && (
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", padding: 16 }}>Scanning chapters...</p>
                  )}

                  {!loading && totalPending === 0 && (
                    <div style={{ textAlign: "center", padding: 20 }}>
                      <p style={{ fontSize: 24, marginBottom: 8 }}>&#x2705;</p>
                      <p style={{ fontSize: 14, color: "var(--color-text)" }}>All slides already have AI notes!</p>
                    </div>
                  )}

                  {totalPending > 0 && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        {Object.entries(uncaptured).map(([chId, caps]) => {
                          const ch = chapters.find((c) => c.id === chId)
                          return (
                            <div key={chId} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)" }}>{ch?.title}</p>
                              <p style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{caps.length} slides to process</p>
                            </div>
                          )
                        })}
                      </div>

                      {loading && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
                            <motion.div animate={{ width: `${(progress.done / progress.total) * 100}%` }}
                              style={{ height: "100%", background: "#3b82f6", borderRadius: 2 }} />
                          </div>
                          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                            {progress.done} / {progress.total} processed
                          </p>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 8 }}>
                        <motion.button onClick={() => setSelectedSubject(null)} whileTap={{ scale: 0.98 }}
                          style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontSize: 14 }}>
                          Back
                        </motion.button>
                        <motion.button onClick={runBatch} disabled={loading} whileTap={{ scale: 0.98 }}
                          style={{ flex: 2, padding: "12px", borderRadius: 10, background: "#3b82f6", color: "#fff", fontSize: 14, fontWeight: 500, opacity: loading ? 0.6 : 1 }}>
                          {loading ? "Generating..." : `Generate ${totalPending} notes`}
                        </motion.button>
                      </div>
                    </>
                  )}
                </>
              )}

              {result && (
                <div style={{ textAlign: "center", padding: 16 }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>&#x2705;</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>
                    {result.success} notes generated
                  </p>
                  {result.failed > 0 && (
                    <p style={{ fontSize: 13, color: "#ef4444", marginTop: 4 }}>{result.failed} failed</p>
                  )}
                  <motion.button onClick={() => { setOpen(false); onDone?.() }} whileTap={{ scale: 0.98 }}
                    style={{ marginTop: 16, padding: "12px 24px", borderRadius: 10, background: "#3b82f6", color: "#fff", fontSize: 14, fontWeight: 500 }}>
                    Done
                  </motion.button>
                </div>
              )}

              <motion.button onClick={() => setOpen(false)} whileTap={{ scale: 0.98 }}
                style={{ marginTop: 12, width: "100%", padding: "10px", borderRadius: 10, border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontSize: 13 }}>
                Cancel
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
