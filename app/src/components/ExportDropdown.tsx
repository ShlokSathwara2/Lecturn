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

const NOTES_APPS = [
  { key: "enex", label: "Apple Notes", ext: ".enex", icon: "\uD83C\uDF4E", desc: "Import via Evernote format" },
  { key: "txt", label: "Samsung Notes", ext: ".txt", icon: "\uD83D\uDCF1", desc: "Import as text file" },
  { key: "pdf", label: "Samsung Notes", ext: ".pdf", icon: "\uD83D\uDCF1", desc: "Import as PDF" },
]

interface Props {
  getUrl: (format: string, includeImages: boolean) => string
  filename: string
  label?: string
}

export default function ExportDropdown({ getUrl, filename, label = "Export" }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState("")
  const [exportError, setExportError] = useState<string | null>(null)
  const [section, setSection] = useState<"formats" | "apps">("formats")

  async function handle(format: string, includeImages: boolean) {
    setBusy(format)
    setExportError(null)
    try {
      const ext = FORMATS.find((f) => f.key === format)?.ext || NOTES_APPS.find((n) => n.key === format && n.desc.includes("PDF" ))?.ext || `.${format}`
      await exportApi.download(getUrl(format, includeImages), `${filename}${ext}`)
      setOpen(false)
    } catch (e: any) {
      setExportError(e?.message || "Export failed. Try again.")
    } finally {
      setBusy("")
    }
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
              style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "rgba(26,26,26,0.95)", backdropFilter: "blur(16px)", border: "1px solid #2a2a2a", borderRadius: 14, zIndex: 100, width: 280, overflow: "hidden" }}>

              <div style={{ display: "flex", borderBottom: "1px solid #2a2a2a" }}>
                <button onClick={() => setSection("formats")}
                  style={{ flex: 1, padding: "10px 0", fontSize: 11, fontFamily: "var(--font-mono)", color: section === "formats" ? "#3b82f6" : "#606060", background: "transparent", borderBottom: section === "formats" ? "2px solid #3b82f6" : "2px solid transparent", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Formats
                </button>
                <button onClick={() => setSection("apps")}
                  style={{ flex: 1, padding: "10px 0", fontSize: 11, fontFamily: "var(--font-mono)", color: section === "apps" ? "#8b5cf6" : "#606060", background: "transparent", borderBottom: section === "apps" ? "2px solid #8b5cf6" : "2px solid transparent", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Notes Apps
                </button>
              </div>

              {exportError && (
                <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
                  <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{exportError}</p>
                </div>
              )}

              {section === "formats" && (
                <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
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
                        <div style={{ display: "flex", gap: 4 }}>
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
              )}

              {section === "apps" && (
                <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {NOTES_APPS.map((n, i) => (
                    <motion.button key={i} onClick={() => handle(n.key, n.key !== "txt")} whileHover={{ backgroundColor: "rgba(139,92,246,0.1)" }} whileTap={{ scale: 0.98 }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", width: "100%" }}>
                      <span style={{ fontSize: 20 }}>{n.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: "#e8e8e8", fontWeight: 500 }}>{n.label}</p>
                        <p style={{ fontSize: 11, color: "#606060" }}>{n.desc}</p>
                      </div>
                      <span style={{ fontSize: 11, color: "#909090" }}>&rarr;</span>
                    </motion.button>
                  ))}
                  <div style={{ padding: "8px 12px", marginTop: 4 }}>
                    <p style={{ fontSize: 10, color: "#606060", lineHeight: 1.5 }}>
                      Apple Notes: Export as .enex, then open Apple Notes &gt; File &gt; Import.{"\n"}
                      Samsung Notes: Export as .txt or .pdf, then open in Samsung Notes app.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
