"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi, processing as processingApi } from "@/lib/api"
import { getQueue, removeFromQueue } from "@/lib/offline-queue"
import { useOnlineStatus } from "@/lib/useOnlineStatus"
import { exportApi } from "@/lib/api"
import ExportDropdown from "@/components/ExportDropdown"

interface Subject { id: string; name: string }
interface Chapter { id: string; subject_id: string; title: string; created_at: string }
interface Capture { id: string; chapter_id: string; subject_id?: string; image_url?: string; raw_text?: string; ai_status: string; status: string; date_taken: string; chapters?: { id: string; title: string; subject_id: string } }

type FormatOption = "exam-oriented" | "easy" | "summary" | "diagram-focused"

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [captures, setCaptures] = useState<Capture[]>([])
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [selectedCaptures, setSelectedCaptures] = useState<Set<string>>(new Set())
  const [showFormatPicker, setShowFormatPicker] = useState(false)
  const [format, setFormat] = useState<FormatOption>("exam-oriented")
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState("")

  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const [unassigned, setUnassigned] = useState<Capture[]>([])
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const refreshQueue = useCallback(async () => {
    try {
      const q = await getQueue()
      setPendingCount(q.length)
    } catch {}
  }, [])

  const syncQueue = useCallback(async () => {
    if (!online || syncing) return
    setSyncing(true)
    try {
      const q = await getQueue()
      for (const item of q) {
        try {
          const { url } = await capturesApi.uploadImage(new File([item.imageBlob], `offline-${item.id.slice(0,8)}.jpg`, { type: "image/jpeg" }))
          await capturesApi.create({
            chapter_id: item.chapterId,
            subject_id: item.subjectId,
            image_url: url,
          })
          await removeFromQueue(item.id)
        } catch (e) {
          console.warn("Sync failed for", item.id, e)
        }
      }
      await refreshQueue()
    } finally {
      setSyncing(false)
    }
  }, [online, syncing])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth"); return }
      subjectsApi.list(data.user.id).then(setSubjects)
      refreshQueue()
    })
  }, [])

  useEffect(() => {
    if (online && pendingCount > 0) syncQueue()
  }, [online])

  useEffect(() => {
    if (selectedSubject) {
      chaptersApi.list(selectedSubject).then(setChapters)
      setCaptures([])
      setSelectedChapters(new Set())
    } else {
      setChapters([])
      setCaptures([])
      setSelectedChapters(new Set())
    }
  }, [selectedSubject])

  useEffect(() => {
    capturesApi.unassigned().then(setUnassigned).catch(() => setUnassigned([]))
  }, [])

  async function loadCaptures() {
    if (selectedChapters.size === 0) return
    const all: Capture[] = []
    for (const chId of selectedChapters) {
      const caps = await capturesApi.list(chId)
      all.push(...caps)
    }
    all.sort((a, b) => new Date(b.date_taken).getTime() - new Date(a.date_taken).getTime())
    setCaptures(all)
  }

  useEffect(() => { loadCaptures() }, [selectedChapters])

  function toggleChapter(id: string) {
    const next = new Set(selectedChapters)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedChapters(next)
    setSelectedCaptures(new Set())
  }

  function toggleCapture(id: string) {
    const next = new Set(selectedCaptures)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedCaptures(next)
  }

  async function handleBatchGenerate() {
    const ids = Array.from(selectedCaptures)
    if (ids.length === 0) { alert("Select captures first"); return }
    setShowFormatPicker(true)
  }

  async function confirmGenerate() {
    const ids = Array.from(selectedCaptures)
    if (ids.length === 0) return
    setShowFormatPicker(false)
    setGenerating(true)
    setGenerateResult("")
    try {
      const results = await processingApi.batch(ids, format)
      const ok = results.filter((r: any) => !r.summary.startsWith("Failed")).length
      setGenerateResult(`Generated ${ok}/${ids.length} captures`)
      loadCaptures()
    } catch (e: any) {
      setGenerateResult(`Error: ${e.message}`)
    } finally {
      setGenerating(false)
    }
  }

  async function assignSubject(captureId: string, subjectId: string) {
    setAssigningId(null)
    try {
      await capturesApi.update(captureId, { subject_id: subjectId })
      setUnassigned((prev) => prev.filter((c) => c.id !== captureId))
    } catch (e) {
      console.warn("Assign failed", e)
    }
  }

  const needsGeneration = captures.filter((c) => c.ai_status === "not_generated")

  const captureItem = (cap: Capture) => {
    const needsAI = cap.ai_status === "not_generated"
    const needsReview = cap.status === "needs_review"
    const borderColor = needsReview ? "#f59e0b" : needsAI ? "#3b82f6" : "#2a2a2a"
    const dotColor = needsReview ? "#f59e0b" : needsAI ? "#3b82f6" : "#059669"
    return (
      <label key={cap.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#1a1a1a", border: `1px solid ${borderColor}`, cursor: "pointer" }}>
        <input type="checkbox" checked={selectedCaptures.has(cap.id)} onChange={() => toggleCapture(cap.id)} style={{ accentColor: "#3b82f6", width: 18, height: 18, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "#e8e8e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {cap.raw_text ? cap.raw_text.slice(0, 60) + "..." : "Slide photo"}
            </p>
          </div>
          <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 2 }}>
            {cap.chapters?.title ? `${cap.chapters.title} · ` : ""}
            {new Date(cap.date_taken).toLocaleString()} · {cap.ai_status.replace("_", " ")}
            {needsReview ? " · needs review" : ""}
          </p>
        </div>
      </label>
    )
  }

  return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "#059669" : "#f59e0b", flexShrink: 0 }} />
          <button onClick={() => router.push("/capture")} style={{ fontSize: 13, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", minHeight: 44 }}>
            Capture
          </button>
          <button onClick={() => router.push("/usage")} style={{ fontSize: 13, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", minHeight: 44 }}>
            Usage
          </button>
          <button onClick={() => router.push("/")} style={{ fontSize: 13, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", minHeight: 44 }}>
            Home
          </button>
        </div>
      </div>

      {pendingCount > 0 && online && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#1a2a1a", border: "1px solid #059669" }}>
          <p style={{ flex: 1, fontSize: 13, color: "#e8e8e8" }}>{pendingCount} capture{pendingCount !== 1 ? "s" : ""} waiting to sync</p>
          <button onClick={syncQueue} disabled={syncing}
            style={{ padding: "6px 14px", borderRadius: 8, background: "#059669", color: "#fff", fontSize: 12, fontWeight: 500, opacity: syncing ? 0.6 : 1 }}>
            {syncing ? "Syncing..." : "Sync now"}
          </button>
        </div>
      )}

      {pendingCount > 0 && !online && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#2a2a1a", border: "1px solid #f59e0b" }}>
          <p style={{ flex: 1, fontSize: 13, color: "#e8e8e8" }}>{pendingCount} capture{pendingCount !== 1 ? "s" : ""} queued — will sync when online</p>
        </div>
      )}

      {unassigned.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 13, color: "#f59e0b", fontFamily: "var(--font-mono)" }}>
            UNASSIGNED ({unassigned.length})
          </p>
          {unassigned.map((cap) => (
            <div key={cap.id} style={{ padding: "10px 12px", borderRadius: 10, background: "#1a1a1a", border: "1px solid #f59e0b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => router.push(`/capture/${cap.id}`)}>
                  <p style={{ fontSize: 13, color: "#e8e8e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cap.raw_text ? cap.raw_text.slice(0, 60) + "..." : "Slide photo"}
                  </p>
                  <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {new Date(cap.date_taken).toLocaleString()} · {cap.ai_status.replace("_", " ")}
                  </p>
                </div>
                {assigningId === cap.id ? (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap" }}>
                    {subjects.length > 0 ? subjects.map((s) => (
                      <button key={s.id} onClick={() => assignSubject(cap.id, s.id)}
                        style={{ padding: "6px 10px", borderRadius: 6, background: "#2a2a2a", color: "#e8e8e8", fontSize: 11, whiteSpace: "nowrap" }}>
                        {s.name}
                      </button>
                    )) : (
                      <span style={{ fontSize: 11, color: "#606060" }}>No subjects — create one from Home first</span>
                    )}
                    <button onClick={() => setAssigningId(null)} style={{ padding: "6px 8px", borderRadius: 6, color: "#606060", fontSize: 11 }}>
                      &times;
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAssigningId(cap.id)}
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #2a2a2a", color: "#f59e0b", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
                  Assign
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
          style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 16, color: "#e8e8e8", outline: "none" }}>
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {selectedSubject && (
          <>
            <button onClick={() => router.push(`/quiz/${selectedSubject}`)}
              style={{ padding: "12px 20px", borderRadius: 10, background: "#7c3aed", color: "#fff", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap" }}>
              Revise
            </button>
            <ExportDropdown
              getUrl={(fmt) => exportApi.subjectUrl(selectedSubject, fmt)}
              filename={subjects.find(s => s.id === selectedSubject)?.name || "subject"}
              label="Export"
            />
          </>
        )}
      </div>

      {selectedSubject && chapters.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 13, color: "#909090", fontFamily: "var(--font-mono)" }}>CHAPTERS</p>
          {chapters.map((ch) => (
            <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: selectedChapters.has(ch.id) ? "#1a2a3a" : "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <input type="checkbox" checked={selectedChapters.has(ch.id)} onChange={() => toggleChapter(ch.id)} style={{ accentColor: "#3b82f6", width: 18, height: 18, flexShrink: 0 }} />
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleChapter(ch.id)}>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{ch.title}</p>
                <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)" }}>
                  {new Date(ch.created_at).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => router.push(`/notes/${ch.id}`)}
                style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", background: "transparent", border: "1px solid #2a2a2a", color: "#909090", whiteSpace: "nowrap" }}>
                Notes &rarr;
              </button>
            </div>
          ))}
        </div>
      )}

      {!selectedSubject && (
        <div style={{ textAlign: "center", padding: 32, border: "1px dashed #2a2a2a", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#606060" }}>Select a subject to browse chapters</p>
        </div>
      )}

      {captures.length > 0 && selectedCaptures.size > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <p style={{ fontSize: 13, color: "#909090", fontFamily: "var(--font-mono)" }}>
            {needsGeneration.length} of {captures.length} need AI
          </p>
          <button onClick={handleBatchGenerate} disabled={generating}
            style={{ padding: "14px 24px", borderRadius: 12, background: "#3b82f6", color: "#fff", fontSize: 16, fontWeight: 600, opacity: generating ? 0.6 : 1 }}>
            {generating ? "Generating..." : `Generate AI (${selectedCaptures.size} selected)`}
          </button>
        </div>
      )}

      {generateResult && (
        <p style={{ fontSize: 13, color: "#059669", textAlign: "center", fontFamily: "var(--font-mono)" }}>
          {generateResult}
        </p>
      )}

      {showFormatPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, border: "1px solid #2a2a2a" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Choose format</h2>
            <p style={{ fontSize: 13, color: "#909090", marginBottom: 16 }}>
              Applied to all {selectedCaptures.size} selected captures
            </p>
            {(["exam-oriented", "easy", "summary", "diagram-focused"] as FormatOption[]).map((f) => (
              <label key={f} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 6, background: format === f ? "#1a2a3a" : "transparent", cursor: "pointer" }}>
                <input type="radio" name="format" checked={format === f} onChange={() => setFormat(f)} style={{ accentColor: "#3b82f6" }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, textTransform: "capitalize" }}>{f.replace("-", " ")}</p>
                  <p style={{ fontSize: 12, color: "#606060" }}>
                    {f === "exam-oriented" ? "Key exam points, definitions, common questions" :
                     f === "easy" ? "Simple explanation with analogies" :
                     f === "summary" ? "Concise plain-text summary" :
                     "Focus on diagrams and visual elements"}
                  </p>
                </div>
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowFormatPicker(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #2a2a2a", fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={confirmGenerate} style={{ flex: 1, padding: 12, borderRadius: 10, background: "#3b82f6", color: "#fff", fontSize: 14, fontWeight: 500 }}>
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
