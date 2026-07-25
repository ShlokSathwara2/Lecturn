"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

const STEPS = [
  {
    icon: "\uD83D\uDCF7",
    title: "Capture Slides",
    desc: "Take photos of lecture slides. Auto-crop, contrast, and deskew applied instantly.",
    color: "#10b981",
  },
  {
    icon: "\uD83E\uDDE0",
    title: "AI Study Notes",
    desc: "Automatically generate study notes from your slides. Choose from 4 formats.",
    color: "#8b5cf6",
  },
  {
    icon: "\uD83C\uDFAF",
    title: "Quiz Yourself",
    desc: "Flashcards generated from your notes. Flip to reveal, track what you know.",
    color: "#f59e0b",
  },
  {
    icon: "\uD83D\uDCC1",
    title: "Organize Everything",
    desc: "Group captures into subjects and chapters. Search by keyword or meaning.",
    color: "#3b82f6",
  },
]

export default function Onboarding() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem("lecturn-onboarded")
    if (!seen) setShow(true)
  }, [])

  function finish() {
    localStorage.setItem("lecturn-onboarded", "1")
    setShow(false)
  }

  if (!show) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 24 }}>
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", maxWidth: 340, width: "100%" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>{s.icon}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#e8e8e8", marginBottom: 10 }}>{s.title}</h2>
          <p style={{ fontSize: 15, color: "#909090", lineHeight: 1.6, marginBottom: 32 }}>{s.desc}</p>

          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 32 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? s.color : "#2a2a2a",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <motion.button onClick={finish} whileTap={{ scale: 0.95 }}
              style={{ flex: 1, padding: "14px 20px", borderRadius: 12, border: "1px solid #2a2a2a", color: "#909090", fontSize: 14 }}>
              Skip
            </motion.button>
            <motion.button onClick={() => isLast ? finish() : setStep(step + 1)} whileTap={{ scale: 0.95 }}
              style={{ flex: 2, padding: "14px 20px", borderRadius: 12, background: s.color, color: "#fff", fontSize: 15, fontWeight: 600 }}>
              {isLast ? "Get Started" : "Next"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
