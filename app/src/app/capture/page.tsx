"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSwipe } from "@/lib/useSwipe"
import { subjects as subjectsApi, chapters as chaptersApi, captures as capturesApi, processing as processApi } from "@/lib/api"
import { createClient } from "@/lib/supabase"
import { preprocess, type PreprocessResult } from "@/lib/preprocess"
import { queueCapture } from "@/lib/offline-queue"
import { useOnlineStatus } from "@/lib/useOnlineStatus"
import { audioNotes as audioNotesApi } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

interface Subject { id: string; name: string }
interface Chapter { id: string; subject_id: string; title: string }

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
      ctx!.fillStyle = "rgba(18,18,18,0.1)"
      ctx!.fillRect(0, 0, w, h)
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0 || d.x > w) d.vx *= -1
        if (d.y < 0 || d.y > h) d.vy *= -1
        ctx!.beginPath()
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx!.fillStyle = "rgba(59,130,246,0.2)"
        ctx!.fill()
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx!.beginPath()
            ctx!.moveTo(dots[i].x, dots[i].y)
            ctx!.lineTo(dots[j].x, dots[j].y)
            ctx!.strokeStyle = `rgba(59,130,246,${0.05 * (1 - dist / 100)})`
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

export default function CapturePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const online = useOnlineStatus()

  const [user, setUser] = useState<any>(null)
  const [rawPreview, setRawPreview] = useState<string | null>(null)
  const [processedPreview, setProcessedPreview] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [queued, setQueued] = useState(false)
  const [assignedChapter, setAssignedChapter] = useState<string | null>(null)
  const [preprocessResult, setPreprocessResult] = useState<PreprocessResult | null>(null)
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [showAssignPicker, setShowAssignPicker] = useState(false)
  const [pendingCaptureId, setPendingCaptureId] = useState<string | null>(null)
  const [assignSubjectName, setAssignSubjectName] = useState("")
  const [assignChapterName, setAssignChapterName] = useState("")
  const [assigning, setAssigning] = useState(false)
  const subjectInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
      } else {
        router.push("/auth")
      }
    })
  }, [])

  useEffect(() => {
    if (showAssignPicker && subjectInputRef.current) {
      setTimeout(() => subjectInputRef.current?.focus(), 300)
    }
  }, [showAssignPicker])

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCapturedFile(file)
    setQueued(false)
    setProcessedPreview(null)
    setPreprocessResult(null)

    const reader = new FileReader()
    reader.onload = () => setRawPreview(reader.result as string)
    reader.readAsDataURL(file)

    setProcessing(true)
    try {
      const result = await preprocess(file)
      setPreprocessResult(result)
      setProcessedPreview(result.processedUrl)
    } catch (err) {
      console.error("Preprocessing failed, using original", err)
      setProcessedPreview(null)
    } finally {
      setProcessing(false)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (e) {
      console.error("Mic access denied", e)
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleSubmit() {
    if (!capturedFile || !user) return
    setUploading(true)

    try {
      const fileToUpload = preprocessResult
        ? new File([preprocessResult.processedBlob], capturedFile.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
        : capturedFile

      if (!online) {
        await queueCapture(fileToUpload, undefined, undefined)
        setQueued(true)
        setUploading(false)
        return
      }

      const { url } = await capturesApi.uploadImage(fileToUpload)
      const cap = await capturesApi.create({ image_url: url })

      try {
        await processApi.capture(cap.id)
      } catch (procErr) {
        console.warn("Processing will run later:", procErr)
      }

      if (audioBlob) {
        try {
          await audioNotesApi.upload(cap.id, audioBlob)
        } catch (e) {
          console.warn("Audio upload failed:", e)
        }
      }

      setPendingCaptureId(cap.id)
      setShowAssignPicker(true)
    } catch (e) {
      alert("Upload failed: " + (e as Error).message)
    } finally {
      setUploading(false)
    }
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
      setAssignedChapter(assignChapterName.trim())

      setShowAssignPicker(false)
      setPendingCaptureId(null)
      setAssignSubjectName("")
      setAssignChapterName("")
      setQueued(true)
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
    setQueued(true)
  }

  function reset() {
    setRawPreview(null)
    setProcessedPreview(null)
    setCapturedFile(null)
    setQueued(false)
    setPreprocessResult(null)
    setAssignedChapter(null)
    setShowAssignPicker(false)
    setPendingCaptureId(null)
    setAssignSubjectName("")
    setAssignChapterName("")
    if (fileRef.current) fileRef.current.value = ""
  }

  useSwipe(() => router.push("/dashboard"))

  return (
    <main style={{ fontFamily: "var(--font-body)", minHeight: "100dvh", position: "relative" }}>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 4s ease infinite;
        }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>

      <ParticleField />

      <div style={{ position: "relative", zIndex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh", maxWidth: 600, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            Capture<span className="gradient-text">.</span>
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "#059669" : "#f59e0b", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: online ? "#059669" : "#f59e0b" }}>{online ? "Online" : "Offline"}</span>
            <motion.button onClick={() => router.push("/dashboard")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ fontSize: 13, color: "#909090", padding: "10px 16px", borderRadius: 10, border: "1px solid #2a2a2a", minHeight: 44 }}>
              Back
            </motion.button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          onClick={() => !rawPreview && fileRef.current?.click()}
          style={{ flex: 1, borderRadius: 16, overflow: "hidden", background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: "2px dashed #2a2a2a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, cursor: rawPreview ? "default" : "pointer", position: "relative" }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: "none" }} />

          {processing ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-block", fontSize: 32, marginBottom: 8 }}>&#x23F3;</motion.div>
              <p style={{ color: "#3b82f6", fontSize: 14 }}>Processing slide...</p>
              <p style={{ color: "#606060", fontSize: 12, marginTop: 4 }}>Auto-crop, contrast, compression</p>
            </div>
          ) : rawPreview ? (
            <div style={{ width: "100%", position: "relative" }}>
              <div style={{ display: "flex", gap: 4, padding: 8 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 4 }}>ORIGINAL</p>
                  <img src={rawPreview} alt="Original" style={{ width: "100%", display: "block", borderRadius: 4 }} />
                </div>
                {processedPreview && (
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: "#3b82f6", fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 4 }}>PROCESSED</p>
                    <img src={processedPreview} alt="Processed" style={{ width: "100%", display: "block", borderRadius: 4 }} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>&#x1F4F7;</div>
              <p style={{ color: "#909090", fontSize: 14 }}>Tap to open camera</p>
            </div>
          )}
        </motion.div>

        {rawPreview && !queued && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(26,26,26,0.7)", backdropFilter: "blur(8px)", border: "1px solid #2a2a2a" }}>
            <button onClick={recording ? stopRecording : startRecording}
              style={{ width: 40, height: 40, borderRadius: "50%", background: recording ? "#dc2626" : audioBlob ? "#059669" : "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: recording ? "pulse 1s infinite" : "none" }}>
              <span style={{ fontSize: 16, color: "#fff" }}>{recording ? "\u23F9" : audioBlob ? "\u2713" : "\uD83C\uDFA4"}</span>
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: "#e8e8e8" }}>
                {recording ? "Recording..." : audioBlob ? "Audio note recorded" : "Tap mic for voice note"}
              </p>
              {audioBlob && (
                <audio controls preload="none" style={{ height: 28, width: "100%", marginTop: 4 }}>
                  <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                </audio>
              )}
            </div>
            {audioBlob && (
              <button onClick={() => setAudioBlob(null)} style={{ fontSize: 16, color: "#909090", padding: 4 }}>&times;</button>
            )}
          </motion.div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          {rawPreview && (
            <motion.button onClick={reset} disabled={uploading || processing} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ flex: 1, padding: "16px 24px", borderRadius: 12, border: "1px solid #2a2a2a", background: "rgba(26,26,26,0.7)", fontSize: 16, fontWeight: 500, color: "#e8e8e8", opacity: uploading || processing ? 0.6 : 1 }}>
              Retake
            </motion.button>
          )}
          <motion.button onClick={rawPreview && !queued ? handleSubmit : () => fileRef.current?.click()}
            disabled={uploading || processing} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ flex: 2, padding: "16px 24px", borderRadius: 12, background: queued ? "#059669" : "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 16, fontWeight: 600, opacity: uploading || processing ? 0.6 : 1 }}>
            {processing ? "Processing..." : uploading ? "Uploading..." : queued ? "Queued \u2713" : rawPreview ? "Upload" : "Open Camera"}
          </motion.button>
        </div>

        {preprocessResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 12, color: "#606060", fontFamily: "var(--font-mono)" }}>
            <span>\u2713 Auto-crop</span>
            <span>\u2713 Contrast</span>
            <span>\u2713 Compressed</span>
          </motion.div>
        )}

        {queued && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: 16, border: "1px solid #2a2a2a", borderRadius: 12, background: "rgba(26,26,26,0.7)" }}>
            {online ? (
              <>
                <p style={{ color: "#059669", fontSize: 14, fontWeight: 500 }}>Slide captured & processed</p>
                {assignedChapter && (
                  <p style={{ color: "#3b82f6", fontSize: 13, fontFamily: "var(--font-mono)", marginTop: 4 }}>Assigned to: {assignedChapter}</p>
                )}
              </>
            ) : (
              <>
                <p style={{ color: "#f59e0b", fontSize: 14, fontWeight: 500 }}>Saved offline</p>
                <p style={{ color: "#909090", fontSize: 12, fontFamily: "var(--font-mono)", marginTop: 4 }}>Will upload when back online</p>
              </>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
              <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #2a2a2a", fontSize: 13 }}>Capture another</button>
              <button onClick={() => router.push("/dashboard")} style={{ padding: "8px 16px", borderRadius: 8, background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 500 }}>Dashboard</button>
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
