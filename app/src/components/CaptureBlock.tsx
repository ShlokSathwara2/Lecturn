"use client"

import { useState } from "react"
import { motion } from "framer-motion"

interface Diagram {
  description: string
  original_crop_url?: string | null
  cleaned_description?: string | null
}

interface CaptureBlockProps {
  imageUrl?: string
  rawText: string
  aiContent?: string | null
  timestamp: string
  aiStatus?: "not_generated" | "auto_generated" | "manually_generated"
  diagrams?: Diagram[]
  editable?: boolean
  onEdit?: (rawText: string, aiContent: string | null) => void
  onDelete?: () => void
  transcript?: string | null
  audioUrl?: string | null
  status?: string
}

export default function CaptureBlock({
  imageUrl,
  rawText,
  aiContent,
  timestamp,
  aiStatus,
  diagrams,
  editable,
  onEdit,
  onDelete,
  transcript,
  audioUrl,
  status,
}: CaptureBlockProps) {
  const showAi = aiContent && aiStatus !== "not_generated"
  const [showOriginal, setShowOriginal] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(rawText)
  const [editAi, setEditAi] = useState(aiContent || "")
  const [showDelete, setShowDelete] = useState(false)

  function handleSave() {
    onEdit?.(editText, editAi || null)
    setEditing(false)
  }

  function handleCancel() {
    setEditText(rawText)
    setEditAi(aiContent || "")
    setEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: "#1a1a1a", borderRadius: 12, overflow: "hidden", border: "1px solid #2a2a2a", position: "relative" }}
    >
      {editable && !editing && (
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, zIndex: 2 }}>
          <button onClick={() => { setEditing(true); setEditText(rawText); setEditAi(aiContent || "") }}
            style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)", background: "rgba(0,0,0,0.6)", color: "#909090", border: "1px solid #2a2a2a" }}>
            Edit
          </button>
          <button onClick={() => setShowDelete(true)}
            style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-mono)", background: "rgba(220,38,38,0.2)", color: "#ef4444", border: "1px solid #ef4444" }}>
            Del
          </button>
        </div>
      )}

      {imageUrl && !editing && (
        <img
          src={imageUrl}
          alt="Slide capture"
          loading="lazy"
          style={{ width: "100%", display: "block", aspectRatio: "4/3", objectFit: "cover", background: "#121212" }}
        />
      )}

      {diagrams && diagrams.length > 0 && !editing && (
        <div style={{ padding: "8px 16px 0" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => setShowOriginal(true)}
              style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)", background: showOriginal ? "#3b82f6" : "transparent", color: showOriginal ? "#fff" : "#909090", border: "1px solid", borderColor: showOriginal ? "#3b82f6" : "#2a2a2a" }}>
              Original
            </button>
            <button onClick={() => setShowOriginal(false)}
              style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)", background: !showOriginal ? "#3b82f6" : "transparent", color: !showOriginal ? "#fff" : "#909090", border: "1px solid", borderColor: !showOriginal ? "#3b82f6" : "#2a2a2a" }}>
              Cleaned
            </button>
          </div>
          {diagrams.map((d, i) => {
            const url = showOriginal ? d.original_crop_url : d.original_crop_url
            if (!url) return null
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <img src={url} alt={d.description} loading="lazy" style={{ width: "100%", borderRadius: 8, display: "block" }} />
                <p style={{ fontSize: 12, color: "#606060", marginTop: 4, fontFamily: "var(--font-mono)" }}>{d.description}</p>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#909090" }}>{timestamp}</span>
          {status === "needs_review" && (
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#f59e0b", padding: "2px 8px", borderRadius: 4, border: "1px solid #f59e0b" }}>
              Needs review
            </span>
          )}
          {status === "duplicate" && (
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#909090", padding: "2px 8px", borderRadius: 4, border: "1px solid #2a2a2a" }}>
              Duplicate
            </span>
          )}
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#606060" }}>Verbatim text</label>
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
              style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid #2a2a2a", background: "#242424", fontSize: 14, color: "#e8e8e8", outline: "none", resize: "vertical", fontFamily: "var(--font-body)" }} />
            <label style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#606060" }}>AI content</label>
            <textarea value={editAi} onChange={(e) => setEditAi(e.target.value)}
              style={{ width: "100%", minHeight: 60, padding: 10, borderRadius: 8, border: "1px solid #2a2a2a", background: "#242424", fontSize: 14, color: "#3b82f6", outline: "none", resize: "vertical", fontFamily: "var(--font-body)" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={handleCancel} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #2a2a2a", fontSize: 12 }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "6px 14px", borderRadius: 8, background: "#3b82f6", color: "#fff", fontSize: 12 }}>Save</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#e8e8e8", whiteSpace: "pre-wrap" }}>{rawText}</p>
            {showAi && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.3, ease: "easeOut" }}
                style={{ padding: 12, borderRadius: 8, background: "rgba(59, 130, 246, 0.08)", borderLeft: "3px solid #3b82f6" }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "#3b82f6" }}>{aiContent}</p>
              </motion.div>
            )}
            {transcript && (
              <div style={{ padding: 10, borderRadius: 8, background: "rgba(245, 158, 11, 0.06)", borderLeft: "3px solid #f59e0b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12 }}>&#x1F399;</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#f59e0b" }}>Audio note</span>
                  {audioUrl && (
                    <audio controls preload="none" style={{ height: 28, marginLeft: "auto" }}>
                      <source src={audioUrl} />
                    </audio>
                  )}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "#e8e8e8", fontStyle: "italic" }}>{transcript}</p>
              </div>
            )}
          </>
        )}
      </div>

      {showDelete && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: 12 }}>
          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 20, margin: 24, border: "1px solid #2a2a2a", textAlign: "center" }}>
            <p style={{ fontSize: 14, marginBottom: 16 }}>Delete this capture?</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setShowDelete(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #2a2a2a", fontSize: 13 }}>Cancel</button>
              <button onClick={() => { setShowDelete(false); onDelete?.() }} style={{ padding: "8px 16px", borderRadius: 8, background: "#dc2626", color: "#fff", fontSize: 13 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
