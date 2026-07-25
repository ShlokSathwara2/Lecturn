"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { exportApi } from "@/lib/api"

const FORMATS = [
  { key: "pdf", label: "PDF", ext: ".pdf", desc: "Best for reading" },
  { key: "docx", label: "Word", ext: ".docx", desc: "Editable document" },
  { key: "rtf", label: "Rich Text", ext: ".rtf", desc: "Universal format" },
  { key: "txt", label: "Plain Text", ext: ".txt", desc: "Lightweight" },
]

interface Props {
  getUrl: (format: string, includeImages: boolean) => string
  filename: string
  label?: string
}

export default function ExportDropdown({ getUrl, filename, label = "Export" }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState("")

  async function handle(format: string, includeImages: boolean) {
    setBusy(format)
    setOpen(false)
    try {
      const ext = FORMATS.find((f) => f.key === format)?.ext || `.${format}`
      await exportApi.download(getUrl(format, includeImages), `${filename}${ext}`)
    } catch (e: any) {
      alert("Export failed: " + e.message)
    }
    setBusy("")
  }

  return (
    <div style={{ position: "relative" }}>
      <motion.button onClick={() => setOpen(!open)} disabled={!!busy}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(26,26,26,0.7)", color: "#e8e8e8", fontSize: 13, fontWeight: 500, border: "1px solid #2a2a2a", whiteSpace: "nowrap", opacity: busy ? 0.6 : 1, fontFamily: "var(--font-mono)" }}>
        {busy ? "Exporting..." : label}
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "rgba(26,26,26,0.95)", backdropFilter: "blur(16px)", border: "1px solid #2a2a2a", borderRadius: 14, zIndex: 100, width: 260, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px 4px" }}>
                <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#606060", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Format
                </p>
              </div>
              <div style={{ padding: "0 8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
                {FORMATS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <motion.button onClick={() => handle(f.key, true)} whileHover={{ backgroundColor: "rgba(59,130,246,0.1)" }} whileTap={{ scale: 0.98 }}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <div>
                          <span style={{ fontSize: 13, color: "#e8e8e8", fontWeight: 500 }}>{f.label}</span>
                          <span style={{ fontSize: 11, color: "#606060", marginLeft: 6 }}>{f.desc}</span>
                        </div>
                        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 4, padding: "1px 5px" }}>+img</span>
                      </motion.button>
                    </div>
                    {f.key !== "txt" && (
                      <div style={{ display: "flex", gap: 4, paddingLeft: 0 }}>
                        <motion.button onClick={() => handle(f.key, false)} whileHover={{ backgroundColor: "rgba(139,92,246,0.1)" }} whileTap={{ scale: 0.98 }}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ fontSize: 12, color: "#909090" }}>{f.label} (text only)</span>
                          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 4, padding: "1px 5px" }}>-img</span>
                        </motion.button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
