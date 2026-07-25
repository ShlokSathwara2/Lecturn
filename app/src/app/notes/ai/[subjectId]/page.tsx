"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { subjects as subjectsApi, aiNotes } from "@/lib/api"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { motion } from "framer-motion"
import { usePageAccent } from "@/lib/AccentContext"

interface NotesContent {
  combined_notes: boolean
  subject_name: string
  explanation: string
  key_points: string[]
  topic_count: number
  total_slides_analyzed: number
  diagrams_included: string[]
}

export default function AINotesPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const subjectId = params.subjectId as string
  usePageAccent("#8b5cf6")

  const [subject, setSubject] = useState<{ name: string } | null>(null)
  const [notes, setNotes] = useState<NotesContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth"); return }
      loadNotes()
    })
  }, [subjectId])

  async function loadNotes() {
    setLoading(true)
    setError(null)
    try {
      const sub = await subjectsApi.get(subjectId)
      setSubject(sub)

      const res = await aiNotes.get(subjectId)
      setNotes(res.content)
    } catch (e: any) {
      setError(e.message || "Failed to load AI notes")
    }
    setLoading(false)
  }

  async function handleDelete() {
    try {
      await aiNotes.delete(subjectId)
      router.push("/notes")
    } catch (e: any) {
      setError(e.message || "Failed to delete")
    }
  }

  async function handleRegenerate() {
    setLoading(true)
    setError(null)
    try {
      const user = await supabase.auth.getUser()
      if (!user.data.user) return
      await aiNotes.generate(subjectId, user.data.user.id)
      await loadNotes()
    } catch (e: any) {
      setError(e.message || "Regeneration failed")
    }
    setLoading(false)
  }

  return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh" }} className="page-with-nav">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={() => router.push("/notes")} style={{ fontSize: 22, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", lineHeight: 1, minWidth: 44, minHeight: 44 }}>
          &larr;
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#909090" }}>{subject?.name || "Loading..."}</p>
          <h1 style={{ fontSize: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <span>&#x2728;</span> AI Generated Notes
          </h1>
        </div>
        {notes && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleRegenerate} style={{ fontSize: 12, color: "#8b5cf6", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)" }}>
              Regenerate
            </button>
            <button onClick={() => setShowDelete(true)} style={{ fontSize: 12, color: "#ef4444", padding: "6px 12px", borderRadius: 8, border: "1px solid #ef4444" }}>
              Delete
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 64 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ fontSize: 28, marginBottom: 12 }}>&#x21BB;</motion.div>
          <p style={{ fontSize: 14, color: "#909090" }}>Loading AI notes...</p>
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", padding: 32, border: "1px solid #ef4444", borderRadius: 12, background: "rgba(239,68,68,0.06)" }}>
          <p style={{ fontSize: 14, color: "#ef4444", marginBottom: 12 }}>{error}</p>
          <button onClick={loadNotes} style={{ padding: "8px 16px", borderRadius: 8, background: "#3b82f6", color: "#fff", fontSize: 13 }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && notes && (
        <>
          {notes.total_slides_analyzed > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)" }}>Slides analyzed</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#8b5cf6" }}>{notes.total_slides_analyzed}</p>
              </div>
              {notes.topic_count > 0 && (
                <div style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)" }}>Topics covered</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>{notes.topic_count}</p>
                </div>
              )}
              {notes.diagrams_included.length > 0 && (
                <div style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)" }}>Diagrams</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{notes.diagrams_included.length}</p>
                </div>
              )}
            </motion.div>
          )}

          {notes.key_points.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ padding: 16, borderRadius: 12, background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#8b5cf6", marginBottom: 8, fontFamily: "var(--font-mono)" }}>KEY POINTS</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {notes.key_points.slice(0, 8).map((kp, i) => (
                  <p key={i} style={{ fontSize: 13, color: "#e8e8e8", lineHeight: 1.5 }}>
                    <span style={{ color: "#8b5cf6", marginRight: 6 }}>&bull;</span>{kp}
                  </p>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ padding: 20, borderRadius: 12, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: "1px solid #2a2a2a" }}>
            <MarkdownRenderer content={notes.explanation} />
          </motion.div>
        </>
      )}

      {!loading && !error && !notes && (
        <div style={{ textAlign: "center", padding: 48, border: "1px dashed #2a2a2a", borderRadius: 12 }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>&#128221;</p>
          <p style={{ fontSize: 14, color: "#606060", marginBottom: 12 }}>No AI notes generated yet for this subject.</p>
          <button onClick={() => router.push("/dashboard")} style={{ padding: "10px 20px", borderRadius: 10, background: "#3b82f6", color: "#fff", fontSize: 14, fontWeight: 500 }}>
            Go to Dashboard to generate
          </button>
        </div>
      )}

      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, border: "1px solid #2a2a2a", textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Delete AI notes?</p>
            <p style={{ fontSize: 13, color: "#909090", marginBottom: 16 }}>This will permanently delete the generated study guide. You can regenerate it anytime.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #2a2a2a", fontSize: 14 }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: 12, borderRadius: 10, background: "#dc2626", color: "#fff", fontSize: 14, fontWeight: 500 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
