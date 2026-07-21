"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi } from "@/lib/api"
import { getQueue, removeFromQueue } from "@/lib/offline-queue"
import { useOnlineStatus } from "@/lib/useOnlineStatus"

interface Subject { id: string; name: string }
interface Chapter { id: string; subject_id: string; title: string; created_at: string }

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<string, Chapter[]>>({})
  const [loading, setLoading] = useState(true)

  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const [newSubjectName, setNewSubjectName] = useState("")
  const [addingSubject, setAddingSubject] = useState(false)

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
      loadSubjects(data.user.id)
      refreshQueue()
    })
  }, [])

  useEffect(() => {
    if (online && pendingCount > 0) syncQueue()
  }, [online])

  async function loadSubjects(userId?: string) {
    setLoading(true)
    try {
      const list = await subjectsApi.list(userId || "")
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
      } catch {}
    }
  }

  async function addSubject() {
    if (!newSubjectName.trim()) return
    setAddingSubject(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await subjectsApi.create({ name: newSubjectName.trim(), user_id: user.id })
      setNewSubjectName("")
      await loadSubjects(user.id)
    } catch (e) {
      console.warn("Failed to add subject", e)
    }
    setAddingSubject(false)
  }

  async function deleteSubject(subjectId: string) {
    if (!confirm("Delete this subject and all its chapters?")) return
    try {
      await subjectsApi.delete(subjectId)
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
      setChaptersBySubject((prev) => { const n = { ...prev }; delete n[subjectId]; return n })
    } catch (e) {
      console.warn("Delete failed", e)
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Dashboard</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "#059669" : "#f59e0b", flexShrink: 0 }} />
          <button onClick={() => router.push("/capture")} style={{ fontSize: 13, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", minHeight: 44 }}>
            Capture
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

      <div style={{ display: "flex", gap: 8 }}>
        <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="New subject name..."
          onKeyDown={(e) => e.key === "Enter" && addSubject()}
          style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 15, color: "#e8e8e8", outline: "none" }} />
        <button onClick={addSubject} disabled={!newSubjectName.trim() || addingSubject}
          style={{ padding: "12px 20px", borderRadius: 10, background: newSubjectName.trim() ? "#3b82f6" : "#2a2a2a", color: "#fff", fontSize: 14, fontWeight: 500, opacity: addingSubject ? 0.6 : 1 }}>
          {addingSubject ? "..." : "Add"}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <p style={{ fontSize: 14, color: "#909090" }}>Loading...</p>
        </div>
      )}

      {!loading && subjects.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, border: "1px dashed #2a2a2a", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#606060" }}>No subjects yet. Add one above.</p>
        </div>
      )}

      {subjects.map((s) => (
        <div key={s.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: expandedSubject === s.id ? "#1a2a3a" : "#1a1a1a", border: "1px solid #2a2a2a", cursor: "pointer" }}
            onClick={() => toggleSubject(s.id)}>
            <span style={{ fontSize: 14, color: expandedSubject === s.id ? "#3b82f6" : "#909090", transition: "transform 0.2s", transform: expandedSubject === s.id ? "rotate(90deg)" : "rotate(0deg)" }}>
              &#9654;
            </span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 500, color: "#e8e8e8" }}>{s.name}</span>
            <button onClick={(e) => { e.stopPropagation(); deleteSubject(s.id) }}
              style={{ padding: "4px 8px", borderRadius: 6, fontSize: 12, color: "#ef4444", border: "1px solid #ef4444", background: "transparent" }}>
              Del
            </button>
          </div>

          {expandedSubject === s.id && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 24, marginTop: 4 }}>
              {(chaptersBySubject[s.id] || []).length === 0 && (
                <p style={{ fontSize: 13, color: "#606060", padding: "8px 0" }}>No chapters yet. Upload a slide and assign to this subject.</p>
              )}
              {(chaptersBySubject[s.id] || []).map((ch) => (
                <div key={ch.id} onClick={() => router.push(`/notes/${ch.id}`)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "#1a1a1a", border: "1px solid #2a2a2a", cursor: "pointer" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e8e8" }}>{ch.title}</p>
                    <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      {new Date(ch.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, color: "#909090" }}>&rarr;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </main>
  )
}
