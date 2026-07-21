"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSwipe } from "@/lib/useSwipe"
import { createClient } from "@/lib/supabase"
import { chapters as chaptersApi, subjects as subjectsApi, captures as capturesApi, audioNotes as audioNotesApi, exportApi } from "@/lib/api"
import CaptureBlock from "@/components/CaptureBlock"
import ExportDropdown from "@/components/ExportDropdown"

interface ChapterInfo { id: string; subject_id: string; title: string; created_at: string }
interface SubjectInfo { id: string; name: string }
interface Capture {
  id: string; chapter_id: string; date_taken: string; image_url?: string | null
  raw_text?: string | null; ai_content_json?: { enrichment?: { explanation?: string } } | null
  ai_status: string; status: string
}

function getDateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

function groupByDate(captures: Capture[]): [string, Capture[]][] {
  const groups = new Map<string, Capture[]>()
  for (const cap of captures) {
    const key = new Date(cap.date_taken).toDateString()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(cap)
  }
  return Array.from(groups.entries())
}

export default function ChapterNotesPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const chapterId = params.chapterId as string

  const [chapter, setChapter] = useState<ChapterInfo | null>(null)
  const [subject, setSubject] = useState<SubjectInfo | null>(null)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [audioMap, setAudioMap] = useState<Record<string, { transcript?: string; audio_url?: string }>>({})
  const [loading, setLoading] = useState(true)

  const [renaming, setRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [showDeleteChapter, setShowDeleteChapter] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [noteText, setNoteText] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth"); return }
      loadData()
    })
  }, [chapterId])

  async function loadData() {
    setLoading(true)
    try {
      const ch = await chaptersApi.get(chapterId)
      setChapter(ch)
      setNewTitle(ch.title)
      const sub = await subjectsApi.get(ch.subject_id)
      setSubject(sub)
      const caps = await capturesApi.list(chapterId)
      setCaptures(caps)

      const audio: Record<string, { transcript?: string; audio_url?: string }> = {}
      for (const cap of caps) {
        try {
          const notes = await audioNotesApi.list(cap.id)
          if (notes.length > 0) {
            audio[cap.id] = { transcript: notes[0].transcript, audio_url: notes[0].audio_url }
          }
        } catch {}
      }
      setAudioMap(audio)
    } catch (e) {
      console.error("Failed to load chapter notes", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleRename() {
    if (!newTitle.trim() || !chapter) return
    await chaptersApi.update(chapter.id, { title: newTitle.trim() })
    setChapter({ ...chapter, title: newTitle.trim() })
    setRenaming(false)
  }

  async function handleDeleteChapter() {
    if (!chapter) return
    await chaptersApi.delete(chapter.id)
    router.push("/dashboard")
  }

  async function handleEditCapture(id: string, rawText: string, aiContent: string | null) {
    await capturesApi.update(id, {
      raw_text: rawText,
      ai_content_json: aiContent ? { enrichment: { explanation: aiContent } } : null,
    })
    setCaptures((prev) => prev.map((c) =>
      c.id === id ? { ...c, raw_text: rawText, ai_content_json: aiContent ? { enrichment: { explanation: aiContent } } : null } : c
    ))
  }

  async function handleDeleteCapture(id: string) {
    await capturesApi.delete(id)
    setCaptures((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleAddNote() {
    if (!noteText.trim() || !chapter) return
    setAddingNote(true)
    try {
      await capturesApi.create({ chapter_id: chapter.id, raw_text: noteText.trim() })
      setNoteText("")
      loadData()
    } catch (e) {
      console.error("Failed to add note", e)
    }
    setAddingNote(false)
  }

  useSwipe(() => router.push("/dashboard"))

  const groups = groupByDate(captures)

  return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={() => router.push("/dashboard")} style={{ fontSize: 22, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", lineHeight: 1, minWidth: 44, minHeight: 44 }}>
          &larr;
        </button>
        <div style={{ flex: 1 }}>
          {subject && <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#909090" }}>{subject.name}</p>}
          {renaming ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus
                style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: "1px solid #3b82f6", background: "#242424", fontSize: 18, fontWeight: 600, color: "#e8e8e8", outline: "none" }} />
              <button onClick={handleRename} style={{ padding: "4px 10px", borderRadius: 6, background: "#3b82f6", color: "#fff", fontSize: 12 }}>Save</button>
              <button onClick={() => setRenaming(false)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a2a2a", fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600 }}>{chapter?.title || "Loading..."}</h1>
                  {chapter && (
                <>
                  <button onClick={() => setRenaming(true)} style={{ fontSize: 13, color: "#909090", padding: "2px 6px", borderRadius: 4, border: "1px solid #2a2a2a" }}>Rename</button>
                  <button onClick={() => setShowDeleteChapter(true)} style={{ fontSize: 13, color: "#ef4444", padding: "2px 6px", borderRadius: 4, border: "1px solid #ef4444" }}>Delete</button>
                  <ExportDropdown
                    getUrl={(fmt) => exportApi.chapterUrl(chapter.id, fmt)}
                    filename={chapter.title.replace(/\s+/g, "_")}
                    label="Export"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <p style={{ fontSize: 14, color: "#909090", fontFamily: "var(--font-mono)" }}>Loading...</p>
        </div>
      )}

      {!loading && captures.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, border: "1px dashed #2a2a2a", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#909090" }}>No captures yet in this chapter.</p>
          <button onClick={() => router.push("/capture")} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 10, background: "#3b82f6", color: "#fff", fontSize: 14, fontWeight: 500 }}>
            Capture a slide
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Type a note to add..."
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 14, color: "#e8e8e8", outline: "none" }} />
        </div>
        <button onClick={handleAddNote} disabled={!noteText.trim() || addingNote}
          style={{ padding: "10px 16px", borderRadius: 10, background: noteText.trim() ? "#3b82f6" : "#2a2a2a", color: "#fff", fontSize: 13, fontWeight: 500, opacity: addingNote ? 0.6 : 1 }}>
          {addingNote ? "..." : "Add"}
        </button>
      </div>

      {!loading && groups.map(([dateKey, caps]) => (
        <div key={dateKey} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8 }}>
            <div style={{ flex: 1, height: 1, background: "#2a2a2a" }} />
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#606060", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {getDateLabel(caps[0].date_taken)}
            </span>
            <div style={{ flex: 1, height: 1, background: "#2a2a2a" }} />
          </div>
          {caps.map((cap) => (
            <CaptureBlock
              key={cap.id}
              imageUrl={cap.image_url || undefined}
              rawText={cap.raw_text || "(No text extracted)"}
              aiContent={cap.ai_content_json?.enrichment?.explanation || null}
              timestamp={new Date(cap.date_taken).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              aiStatus={cap.ai_status as any}
              editable
              onEdit={(t, ai) => handleEditCapture(cap.id, t, ai)}
              onDelete={() => handleDeleteCapture(cap.id)}
              transcript={audioMap[cap.id]?.transcript || null}
              audioUrl={audioMap[cap.id]?.audio_url || null}
              status={cap.status}
            />
          ))}
        </div>
      ))}

      {!loading && captures.length > 0 && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ fontSize: 12, color: "#606060", fontFamily: "var(--font-mono)" }}>
            {captures.length} capture{captures.length !== 1 ? "s" : ""} &middot; End of chapter
          </p>
        </div>
      )}

      {showDeleteChapter && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, border: "1px solid #2a2a2a", textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Delete chapter?</p>
            <p style={{ fontSize: 13, color: "#909090", marginBottom: 16 }}>This will permanently delete all {captures.length} captures in this chapter.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowDeleteChapter(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #2a2a2a", fontSize: 14 }}>Cancel</button>
              <button onClick={handleDeleteChapter} style={{ flex: 1, padding: 12, borderRadius: 10, background: "#dc2626", color: "#fff", fontSize: 14, fontWeight: 500 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
