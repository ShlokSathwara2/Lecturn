"use client"

import { useState } from "react"
import { exportApi } from "@/lib/api"

const FORMATS = [
  { key: "pdf", label: "PDF (.pdf)" },
  { key: "docx", label: "Word (.docx)" },
  { key: "rtf", label: "Rich Text (.rtf)" },
  { key: "txt", label: "Plain Text (.txt)" },
  { key: "enex", label: "Evernote (.enex)" },
]

interface Props {
  getUrl: (format: string) => string
  filename: string
  label?: string
}

export default function ExportDropdown({ getUrl, filename, label = "Export" }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState("")

  async function handle(format: string) {
    setBusy(format)
    setOpen(false)
    try {
      await exportApi.download(getUrl(format), `${filename}.${format}`)
    } catch (e: any) {
      alert("Export failed: " + e.message)
    }
    setBusy("")
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} disabled={!!busy}
        style={{ padding: "12px 20px", borderRadius: 10, background: "#1a1a1a", color: "#e8e8e8", fontSize: 14, fontWeight: 500, border: "1px solid #2a2a2a", whiteSpace: "nowrap", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Exporting..." : label}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, zIndex: 100, minWidth: 180, overflow: "hidden" }}>
            {FORMATS.map((f) => (
              <button key={f.key} onClick={() => handle(f.key)}
                style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", fontSize: 13, color: "#e8e8e8", background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
