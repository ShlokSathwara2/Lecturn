"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSwipe } from "@/lib/useSwipe"
import { captures as capturesApi, audioNotes as audioNotesApi } from "@/lib/api"
import CaptureBlock from "@/components/CaptureBlock"

interface Capture {
  id: string; chapter_id?: string; subject_id?: string; date_taken: string; image_url?: string | null
  raw_text?: string | null; ai_content_json?: any; ai_status: string; status: string
}

export default function CaptureDetailPage() {
  const params = useParams()
  const router = useRouter()
  const captureId = params.id as string

  const [capture, setCapture] = useState<Capture | null>(null)
  const [audio, setAudio] = useState<{ transcript?: string; audio_url?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [captureId])

  async function loadData() {
    setLoading(true)
    try {
      const cap = await capturesApi.get(captureId)
      setCapture(cap)
      try {
        const notes = await audioNotesApi.list(captureId)
        if (notes.length > 0) setAudio({ transcript: notes[0].transcript, audio_url: notes[0].audio_url })
      } catch {}
    } catch (e) {
      console.error("Failed to load capture", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleEdit(rawText: string, aiContent: string | null) {
    await capturesApi.update(captureId, {
      raw_text: rawText,
      ai_content_json: aiContent ? { enrichment: { explanation: aiContent } } : null,
    })
    setCapture((prev) => prev ? {
      ...prev,
      raw_text: rawText,
      ai_content_json: aiContent ? { enrichment: { explanation: aiContent } } : null,
    } : null)
  }

  async function handleDelete() {
    await capturesApi.delete(captureId)
    router.back()
  }

  useSwipe(() => router.back())

  return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 22, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", lineHeight: 1, minWidth: 44, minHeight: 44 }}>
          &larr;
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Capture</h1>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <p style={{ fontSize: 14, color: "#909090" }}>Loading...</p>
        </div>
      )}

      {!loading && capture && (
        <CaptureBlock
          imageUrl={capture.image_url || undefined}
          rawText={capture.raw_text || "(No text extracted)"}
          aiContent={capture.ai_content_json?.enrichment?.explanation || null}
          timestamp={new Date(capture.date_taken).toLocaleString()}
          aiStatus={capture.ai_status as any}
          editable
          onEdit={handleEdit}
          onDelete={handleDelete}
          transcript={audio?.transcript || null}
          audioUrl={audio?.audio_url || null}
          status={capture.status}
        />
      )}

      {!loading && !capture && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <p style={{ fontSize: 14, color: "#909090" }}>Capture not found.</p>
        </div>
      )}
    </main>
  )
}
