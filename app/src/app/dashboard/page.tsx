"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi, dashboard as dashboardApi } from "@/lib/api"
import { getQueue, removeFromQueue } from "@/lib/offline-queue"
import { useOnlineStatus } from "@/lib/useOnlineStatus"
import { motion, AnimatePresence } from "framer-motion"
import { usePageAccent } from "@/lib/AccentContext"
import BatchAIGeneration from "@/components/BatchAIGeneration"
import ParticleField from "@/components/ParticleField"
import useSWR from "swr"

interface Subject { id: string; name: string }
interface Chapter { id: string; subject_id: string; title: string; created_at: string }
interface Capture { id: string; chapter_id: string; subject_id?: string; date_taken: string; image_url?: string; raw_text?: string; ai_status: string; status: string }

function AnimatedOrbs() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <motion.div animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)" }} />
      <motion.div animate={{ x: [0, -40, 30, 0], y: [0, 50, -30, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", bottom: "15%", right: "8%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)" }} />
      <motion.div animate={{ x: [0, 20, -30, 0], y: [0, -30, 40, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", top: "50%", left: "60%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(5,150,105,0.04) 0%, transparent 70%)" }} />
    </div>
  )
}

function DonutChart({ withNotes, withoutNotes }: { withNotes: number; withoutNotes: number }) {
  const total = withNotes + withoutNotes
  if (total === 0) return null
  const radius = 60
  const strokeWidth = 14
  const circumference = 2 * Math.PI * radius
  const withPct = withNotes / total
  const withoutPct = withoutNotes / total
  const withDash = withPct * circumference
  const withoutDash = withoutPct * circumference

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 0" }}>
      <div style={{ position: "relative", width: 152, height: 152, flexShrink: 0 }}>
        <svg width="152" height="152" viewBox="0 0 152 152" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="76" cy="76" r={radius} fill="none" stroke="#2a2a2a" strokeWidth={strokeWidth} />
          {withNotes > 0 && (
            <motion.circle cx="76" cy="76" r={radius} fill="none" stroke="#3b82f6" strokeWidth={strokeWidth}
              strokeDasharray={`${withDash} ${circumference - withDash}`} strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }} />
          )}
          {withoutNotes > 0 && (
            <motion.circle cx="76" cy="76" r={radius} fill="none" stroke="#8b5cf6" strokeWidth={strokeWidth}
              strokeDasharray={`${withoutDash} ${circumference - withoutDash}`}
              strokeDashoffset={-withDash} strokeLinecap="round"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }} />
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#e8e8e8" }}>{total}</span>
          <span style={{ fontSize: 10, color: "#606060", fontFamily: "var(--font-mono)" }}>SUBJECTS</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#909090" }}>{withNotes} with notes</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#909090" }}>{withoutNotes} without notes</span>
        </div>
      </div>
    </div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  usePageAccent("#3b82f6")

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<string, Chapter[]>>({})
  const [chaptersCountBySubject, setChaptersCountBySubject] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>("")

  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const [newSubjectName, setNewSubjectName] = useState("")
  const [addingSubject, setAddingSubject] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")

  const [subjectsNotesMap, setSubjectsNotesMap] = useState<Record<string, number>>({})

  const [unassignedCaptures, setUnassignedCaptures] = useState<Capture[]>([])
  const [showAssignPicker, setShowAssignPicker] = useState(false)
  const [pendingCaptureId, setPendingCaptureId] = useState<string | null>(null)
  const [assignSubjectName, setAssignSubjectName] = useState("")
  const [assignChapterName, setAssignChapterName] = useState("")
  const [assigning, setAssigning] = useState(false)
  const subjectInputRef = useRef<HTMLInputElement>(null)

  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to fetch")
    return res.json()
  }, [])

  const { data: dashData, mutate: mutateDash } = useSWR(
    userId ? `/api/proxy?path=${encodeURIComponent(`/dashboard/${userId}`)}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      refreshInterval: 30000,
    }
  )

  useEffect(() => {
    if (dashData) {
      setSubjects(dashData.subjects || [])
      setChaptersCountBySubject(dashData.chapters_count || {})
      setSubjectsNotesMap(dashData.notes_count || {})
      setUnassignedCaptures(dashData.unassigned || [])
      setLoading(false)
    }
  }, [dashData])

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
      setUserId(data.user.id)
      refreshQueue()
    })
  }, [])

  useEffect(() => {
    if (online && pendingCount > 0) syncQueue()
  }, [online])

  useEffect(() => {
    if (showAssignPicker && subjectInputRef.current) {
      setTimeout(() => subjectInputRef.current?.focus(), 300)
    }
  }, [showAssignPicker])

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
      mutateDash()
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

  async function openAssign(captureId: string) {
    setPendingCaptureId(captureId)
    setAssignSubjectName("")
    setAssignChapterName("")
    setShowAssignPicker(true)
  }

  async function confirmAssign() {
    if (!pendingCaptureId || !assignSubjectName.trim() || !assignChapterName.trim()) return
    setAssigning(true)

    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return

      const existingSubjects = await subjectsApi.list(u.id)
      let subject = existingSubjects.find((s: Subject) => s.name.toLowerCase() === assignSubjectName.trim().toLowerCase())

      if (!subject) {
        subject = await subjectsApi.create({ name: assignSubjectName.trim(), user_id: u.id })
      }

      const existingChapters = await chaptersApi.list(subject.id)
      let chapter = existingChapters.find((c: Chapter) => c.title.toLowerCase() === assignChapterName.trim().toLowerCase())

      if (!chapter) {
        chapter = await chaptersApi.create({ subject_id: subject.id, title: assignChapterName.trim() })
      }

      await capturesApi.update(pendingCaptureId, { chapter_id: chapter.id })

      setShowAssignPicker(false)
      setPendingCaptureId(null)
      setAssignSubjectName("")
      setAssignChapterName("")
      mutateDash()
    } catch (e) {
      console.warn("Assign failed", e)
    }
    setAssigning(false)
  }

  function skipAssign() {
    setShowAssignPicker(false)
    setPendingCaptureId(null)
    setAssignSubjectName("")
    setAssignChapterName("")
  }

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const subjectsWithNotes = filteredSubjects.filter((s) => (subjectsNotesMap[s.id] || 0) > 0).length
  const subjectsWithoutNotes = filteredSubjects.length - subjectsWithNotes

  function getCaptureLabel(cap: Capture) {
    if (cap.raw_text) return cap.raw_text.slice(0, 60) + (cap.raw_text.length > 60 ? "..." : "")
    if (cap.image_url) return "Photo capture"
    return "Untitled capture"
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
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #059669);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 4s ease infinite;
        }
      `}</style>

      <ParticleField color="59,130,246" dotCount={40} connectionDistance={120} />
      <AnimatedOrbs />

      <div style={{ position: "relative", zIndex: 1, padding: 16, maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            Dashboard<span className="gradient-text">.</span>
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "#059669" : "#f59e0b", flexShrink: 0 }} />
            {userId && <BatchAIGeneration userId={userId} onDone={() => mutateDash()} />}
          </div>
        </motion.div>

        {pendingCount > 0 && online && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.3)" }}>
            <p style={{ flex: 1, fontSize: 13, color: "#e8e8e8" }}>{pendingCount} capture{pendingCount !== 1 ? "s" : ""} waiting to sync</p>
            <button onClick={syncQueue} disabled={syncing}
              style={{ padding: "6px 14px", borderRadius: 8, background: "#059669", color: "#fff", fontSize: 12, fontWeight: 500, opacity: syncing ? 0.6 : 1 }}>
              {syncing ? "Syncing..." : "Sync now"}
            </button>
          </motion.div>
        )}

        {pendingCount > 0 && !online && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <p style={{ flex: 1, fontSize: 13, color: "#e8e8e8" }}>{pendingCount} capture{pendingCount !== 1 ? "s" : ""} queued — will sync when online</p>
          </motion.div>
        )}

        {filteredSubjects.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ padding: "16px 20px", borderRadius: 16, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(12px)", border: "1px solid #2a2a2a" }}>
            <DonutChart withNotes={subjectsWithNotes} withoutNotes={subjectsWithoutNotes} />
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ display: "flex", gap: 8 }}>
          <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="New subject name..."
            onKeyDown={(e) => e.key === "Enter" && addSubject()}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #2a2a2a", background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", fontSize: 15, color: "#e8e8e8", outline: "none" }} />
          <motion.button onClick={addSubject} disabled={!newSubjectName.trim() || addingSubject}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{ padding: "12px 20px", borderRadius: 10, background: newSubjectName.trim() ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "#2a2a2a", color: "#fff", fontSize: 14, fontWeight: 500, opacity: addingSubject ? 0.6 : 1 }}>
            {addingSubject ? "..." : "Add"}
          </motion.button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ position: "relative" }}>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects..."
            style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 10, border: "1px solid #2a2a2a", background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", fontSize: 14, color: "#e8e8e8", outline: "none" }} />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#606060" }}>&#128269;</span>
        </motion.div>

        {loading && (
          <div style={{ textAlign: "center", padding: 32 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block", fontSize: 20, color: "#3b82f6" }}>&#x21BB;</motion.div>
            <p style={{ fontSize: 14, color: "#909090", marginTop: 8 }}>Loading...</p>
          </div>
        )}

        {!loading && filteredSubjects.length === 0 && unassignedCaptures.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: 32, border: "1px dashed #2a2a2a", borderRadius: 12 }}>
            <p style={{ fontSize: 14, color: "#606060" }}>
              {searchQuery ? "No subjects match your search." : "No subjects yet. Add one above."}
            </p>
          </motion.div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredSubjects.map((s) => (
            <motion.div key={s.id} variants={itemVariants}>
              <motion.div
                whileHover={{ borderColor: "rgba(59,130,246,0.3)" }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRadius: 12, background: expandedSubject === s.id ? "rgba(59,130,246,0.08)" : "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: "1px solid #2a2a2a", cursor: "pointer", transition: "all 0.2s ease" }}
                onClick={() => toggleSubject(s.id)}>
                <motion.span animate={{ rotate: expandedSubject === s.id ? 90 : 0 }} transition={{ duration: 0.2 }}
                  style={{ fontSize: 12, color: expandedSubject === s.id ? "#3b82f6" : "#606060" }}>
                  &#9654;
                </motion.span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#e8e8e8" }}>{s.name}</p>
                  <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)" }}>
                      {chaptersCountBySubject[s.id] || 0} chapters
                    </span>
                    <span style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)" }}>
                      {subjectsNotesMap[s.id] || 0} notes
                    </span>
                  </div>
                </div>
                <motion.button onClick={(e) => { e.stopPropagation(); deleteSubject(s.id) }}
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(239,68,68,0.15)" }}
                  style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", background: "transparent" }}>
                  Del
                </motion.button>
              </motion.div>

              <AnimatePresence>
                {expandedSubject === s.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 24, paddingTop: 4 }}>
                      {(chaptersBySubject[s.id] || []).length === 0 && (
                        <p style={{ fontSize: 13, color: "#606060", padding: "8px 0" }}>No chapters yet.</p>
                      )}
                      {(chaptersBySubject[s.id] || []).map((ch, i) => (
                        <motion.div key={ch.id}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          onClick={() => router.push(`/notes/${ch.id}`)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "rgba(26,26,26,0.5)", border: "1px solid #2a2a2a", cursor: "pointer", transition: "all 0.2s ease" }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e8e8" }}>{ch.title}</p>
                            <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                              {new Date(ch.created_at).toLocaleDateString()}
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

        {!loading && unassignedCaptures.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#f59e0b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Unassigned ({unassignedCaptures.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unassignedCaptures.map((cap, i) => (
                <motion.div key={cap.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/capture/${cap.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(245,158,11,0.2)", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e8e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getCaptureLabel(cap)}
                    </p>
                    <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      {new Date(cap.date_taken).toLocaleDateString()} &middot; {cap.ai_status === "auto_generated" ? "auto generated" : "not generated"}
                    </p>
                  </div>
                  <motion.button onClick={(e) => { e.stopPropagation(); openAssign(cap.id) }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: 13, fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap", position: "relative", zIndex: 2 }}>
                    Assign
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showAssignPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: "rgba(26,26,26,0.95)", backdropFilter: "blur(20px)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, border: "1px solid rgba(59,130,246,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
              <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ color: "#e8e8e8", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                Assign to subject & chapter
              </motion.h3>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                style={{ color: "#606060", fontSize: 13, marginBottom: 20 }}>
                Type the subject and chapter name below
              </motion.p>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <label style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#3b82f6", marginBottom: 6, display: "block", letterSpacing: "0.08em" }}>SUBJECT</label>
                <input ref={subjectInputRef} value={assignSubjectName} onChange={(e) => setAssignSubjectName(e.target.value)}
                  placeholder="e.g. Linear Algebra"
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 16, color: "#e8e8e8", outline: "none", marginBottom: 16, transition: "border-color 0.2s ease" }}
                  onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.style.borderColor = "#2a2a2a"} />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                <label style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#8b5cf6", marginBottom: 6, display: "block", letterSpacing: "0.08em" }}>CHAPTER</label>
                <input value={assignChapterName} onChange={(e) => setAssignChapterName(e.target.value)}
                  placeholder="e.g. Matrix Operations"
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 16, color: "#e8e8e8", outline: "none", marginBottom: 20, transition: "border-color 0.2s ease" }}
                  onFocus={(e) => e.target.style.borderColor = "#8b5cf6"}
                  onBlur={(e) => e.target.style.borderColor = "#2a2a2a"}
                  onKeyDown={(e) => e.key === "Enter" && assignSubjectName.trim() && assignChapterName.trim() && confirmAssign()} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ display: "flex", gap: 10 }}>
                <motion.button onClick={skipAssign} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ flex: 1, padding: "14px 16px", borderRadius: 12, border: "1px solid #2a2a2a", fontSize: 14, color: "#909090", background: "transparent" }}>
                  Skip
                </motion.button>
                <motion.button onClick={confirmAssign}
                  disabled={assigning || !assignSubjectName.trim() || !assignChapterName.trim()}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ flex: 1, padding: "14px 16px", borderRadius: 12, background: assignSubjectName.trim() && assignChapterName.trim() ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "#2a2a2a", color: "#fff", fontSize: 14, fontWeight: 500, opacity: assigning || !assignSubjectName.trim() || !assignChapterName.trim() ? 0.6 : 1 }}>
                  {assigning ? "Assigning..." : "Assign"}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
