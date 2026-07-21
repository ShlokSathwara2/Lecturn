"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSwipe } from "@/lib/useSwipe"
import { subjects as subjectsApi, captures as capturesApi, processing as processApi } from "@/lib/api"
import { createClient } from "@/lib/supabase"
import { preprocess, type PreprocessResult } from "@/lib/preprocess"
import { queueCapture } from "@/lib/offline-queue"
import { useOnlineStatus } from "@/lib/useOnlineStatus"
import { audioNotes as audioNotesApi } from "@/lib/api"

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
  const [subjectsList, setSubjectsList] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [queued, setQueued] = useState(false)
  const [assignedChapter, setAssignedChapter] = useState<string | null>(null)
  const [preprocessResult, setPreprocessResult] = useState<PreprocessResult | null>(null)
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [pendingCaptureId, setPendingCaptureId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        subjectsApi.list(data.user.id).then(setSubjectsList)
      } else {
        router.push("/auth")
      }
    })

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

      const cap = await capturesApi.create({
        image_url: url,
      })

      try {
        const processResult = await processApi.capture(cap.id)
        setAssignedChapter(processResult?.chapter_title || null)
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
      setShowSubjectPicker(true)
    } catch (e) {
      alert("Upload failed: " + (e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function assignSubject(subjectId: string) {
    if (!pendingCaptureId) return
    try {
      await fetch(`/api/proxy?path=/captures/${pendingCaptureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: subjectId }),
      })
    } catch (e) {
      console.warn("Subject assignment failed:", e)
    }
    setShowSubjectPicker(false)
    setPendingCaptureId(null)
    setQueued(true)
  }

  function reset() {
    setRawPreview(null)
    setProcessedPreview(null)
    setCapturedFile(null)
    setQueued(false)
    setPreprocessResult(null)
    setAssignedChapter(null)
    setShowSubjectPicker(false)
    setPendingCaptureId(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  useSwipe(() => router.push("/dashboard"))

  return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Capture</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "#059669" : "#f59e0b", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: online ? "#059669" : "#f59e0b" }}>{online ? "Online" : "Offline"}</span>
          <button onClick={() => router.push("/")} style={{ fontSize: 13, color: "#909090", padding: "10px 16px", borderRadius: 10, border: "1px solid #2a2a2a", minHeight: 44 }}>
            Back
          </button>
        </div>
      </div>

      <div onClick={() => !rawPreview && fileRef.current?.click()}
        style={{ flex: 1, borderRadius: 16, overflow: "hidden", background: "#1a1a1a", border: "2px dashed #2a2a2a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, cursor: rawPreview ? "default" : "pointer", position: "relative" }}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: "none" }} />

        {processing ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
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
            <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
            <p style={{ color: "#909090", fontSize: 14 }}>Tap to open camera</p>
          </div>
        )}
      </div>

      {rawPreview && !queued && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <button onClick={recording ? stopRecording : startRecording}
            style={{ width: 40, height: 40, borderRadius: "50%", background: recording ? "#dc2626" : audioBlob ? "#059669" : "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: recording ? "pulse 1s infinite" : "none" }}>
            <span style={{ fontSize: 16, color: "#fff" }}>{recording ? "⏹" : audioBlob ? "✓" : "🎤"}</span>
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
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        {rawPreview && (
          <button onClick={reset} disabled={uploading || processing}
            style={{ flex: 1, padding: "16px 24px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#1a1a1a", fontSize: 16, fontWeight: 500, color: "#e8e8e8", opacity: uploading || processing ? 0.6 : 1 }}>
            Retake
          </button>
        )}
        <button onClick={rawPreview && !queued ? handleSubmit : () => fileRef.current?.click()}
          disabled={uploading || processing}
          style={{ flex: 2, padding: "16px 24px", borderRadius: 12, background: queued ? "#059669" : "#3b82f6", color: "#fff", fontSize: 16, fontWeight: 600, opacity: uploading || processing ? 0.6 : 1 }}>
          {processing ? "Processing..." : uploading ? "Uploading..." : queued ? "Queued ✓" : rawPreview ? "Upload Cleaned" : "Open Camera"}
        </button>
      </div>

      {preprocessResult && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 12, color: "#606060", fontFamily: "var(--font-mono)" }}>
          <span>✓ Auto-crop</span>
          <span>✓ Contrast</span>
          <span>✓ Compressed</span>
        </div>
      )}

      {queued && (
        <div style={{ textAlign: "center", padding: 16, border: "1px solid #2a2a2a", borderRadius: 12, background: "#1a1a1a" }}>
          {online ? (
            <>
              <p style={{ color: "#059669", fontSize: 14, fontWeight: 500 }}>Slide captured &amp; processed</p>
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
        </div>
      )}

      {showSubjectPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, border: "1px solid #2a2a2a" }}>
            <h3 style={{ color: "#e8e8e8", fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Assign to subject</h3>
            <p style={{ color: "#606060", fontSize: 13, marginBottom: 16 }}>Which subject is this slide for?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {subjectsList.map((s) => (
                <button key={s.id} onClick={() => assignSubject(s.id)}
                  style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #2a2a2a", background: "#222", color: "#e8e8e8", fontSize: 15, fontWeight: 500, textAlign: "left", cursor: "pointer" }}>
                  {s.name}
                </button>
              ))}
              {subjectsList.length === 0 && (
                <p style={{ color: "#606060", fontSize: 13, textAlign: "center", padding: 12 }}>No subjects yet. Create one from the dashboard.</p>
              )}
            </div>
            <button onClick={() => { setShowSubjectPicker(false); setPendingCaptureId(null); setQueued(true); }}
              style={{ width: "100%", marginTop: 12, padding: "12px 16px", borderRadius: 10, border: "1px solid #2a2a2a", fontSize: 14, color: "#909090", background: "transparent" }}>
              Skip for now
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
