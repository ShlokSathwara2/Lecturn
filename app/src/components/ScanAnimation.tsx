"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

interface ScanAnimationProps {
  active: boolean
  onComplete?: () => void
}

export default function ScanAnimation({ active, onComplete }: ScanAnimationProps) {
  const [progress, setProgress] = useState(0)
  const [foundBoxes, setFoundBoxes] = useState<{ top: number; left: number; width: number; height: number }[]>([])

  useEffect(() => {
    if (!active) {
      setProgress(0)
      setFoundBoxes([])
      return
    }

    const duration = 2000
    const interval = 30
    const step = interval / duration

    const textBoxes = [
      { top: 10, left: 8, width: 84, height: 12 },
      { top: 28, left: 8, width: 60, height: 8 },
      { top: 40, left: 8, width: 72, height: 8 },
      { top: 52, left: 8, width: 55, height: 8 },
    ]

    const diagramBox = { top: 55, left: 55, width: 38, height: 35 }

    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + step
        if (next >= 0.3) setFoundBoxes((prev) => (prev.length === 0 ? [textBoxes[0]] : prev))
        if (next >= 0.5) setFoundBoxes((prev) => (prev.length === 1 ? [...prev, textBoxes[1]] : prev))
        if (next >= 0.65) setFoundBoxes((prev) => (prev.length === 2 ? [...prev, textBoxes[2]] : prev))
        if (next >= 0.75) setFoundBoxes((prev) => (prev.length === 3 ? [...prev, textBoxes[3], diagramBox] : prev))
        if (next >= 1) {
          clearInterval(t)
          onComplete?.()
          return 1
        }
        return next
      })
    }, interval)

    return () => clearInterval(t)
  }, [active, onComplete])

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 12, overflow: "hidden", background: "#1a1a1a" }}>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ y: "-10%" }}
            animate={{ y: `${progress * 100}%` }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0, ease: "linear" }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 3,
              background: "linear-gradient(180deg, transparent, #3b82f6, transparent)",
              boxShadow: "0 0 12px #3b82f6, 0 0 24px rgba(59, 130, 246, 0.3)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {foundBoxes.map((box, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: `${box.top}%`,
            left: `${box.left}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
            border: "1.5px solid rgba(59, 130, 246, 0.6)",
            borderRadius: 4,
            boxShadow: "inset 0 0 8px rgba(59, 130, 246, 0.1), 0 0 8px rgba(59, 130, 246, 0.15)",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  )
}
