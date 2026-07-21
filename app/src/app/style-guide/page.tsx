"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import ScanAnimation from "@/components/ScanAnimation"
import CaptureBlock from "@/components/CaptureBlock"

const colors = [
  { name: "Base", token: "--color-base", value: "#121212" },
  { name: "Surface", token: "--color-surface", value: "#1a1a1a" },
  { name: "Surface Raised", token: "--color-surface-raised", value: "#242424" },
  { name: "Border", token: "--color-border", value: "#2a2a2a" },
  { name: "Text", token: "--color-text", value: "#e8e8e8" },
  { name: "Text Secondary", token: "--color-text-secondary", value: "#909090" },
  { name: "Accent (AI Blue)", token: "--color-accent", value: "#3b82f6" },
]

export default function StyleGuidePage() {
  const [scanActive, setScanActive] = useState(false)
  const [scanDone, setScanDone] = useState(false)

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24, fontFamily: "var(--font-body)" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>SlideScribe</h1>
      <p style={{ fontSize: 14, color: "#909090", fontFamily: "var(--font-mono)", marginBottom: 32 }}>
        Design System v1
      </p>

      {/* Colors */}
      <Section title="Color Tokens">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {colors.map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: c.value, border: "1px solid #333" }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</p>
                <p style={{ fontSize: 12, color: "#909090", fontFamily: "var(--font-mono)" }}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Type */}
      <Section title="Type Scale">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ fontSize: 24, fontWeight: 600 }}>Heading — Inter SemiBold 24px</p>
          <p style={{ fontSize: 16 }}>Body — Inter Regular 16px</p>
          <p style={{ fontSize: 14, color: "#909090" }}>Secondary — Inter Regular 14px</p>
          <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#909090" }}>
            Mono — Plex Mono 12px (timestamps, metadata)
          </p>
        </div>
      </Section>

      {/* Scan Animation */}
      <Section title="Signature Moment: Scan Effect">
        <p style={{ fontSize: 13, color: "#909090", marginBottom: 12 }}>
          The HUD scan-line sweeps top-to-bottom. Text blocks and diagram bounding boxes outline in blue as detected.
        </p>
        <ScanAnimation active={scanActive} onComplete={() => setScanDone(true)} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => { setScanActive(true); setScanDone(false) }}
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Play Scan
          </button>
          {scanDone && <span style={{ fontSize: 12, color: "#3b82f6", fontFamily: "var(--font-mono)", alignSelf: "center" }}>/* detected */</span>}
        </div>
      </Section>

      {/* Capture Block */}
      <Section title="Capture Block (with AI Content)">
        <CaptureBlock
          imageUrl=""
          rawText="Binary trees are a hierarchical data structure where each node has at most two children, referred to as the left child and the right child."
          aiContent="Key points: Each node has 0, 1, or 2 children. Leaf nodes have no children. Common traversals: inorder, preorder, postorder."
          timestamp="2026-07-21 10:30 AM"
          aiStatus="auto_generated"
        />
      </Section>

      {/* AI-only styling */}
      <Section title="AI Content Styling Rule">
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          All AI-generated content renders in{" "}
          <span style={{ color: "#3b82f6", fontWeight: 500 }}>electric blue (#3b82f6)</span>
          , with a subtle blue-tinted background block and left border accent.
          This color is reserved exclusively for AI content — never used decoratively elsewhere.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 32 }}
    >
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "#909090", fontFamily: "var(--font-mono)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </h2>
      {children}
    </motion.div>
  )
}
