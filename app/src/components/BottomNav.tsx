"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useRef, useState, useEffect } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { useAccent } from "@/lib/AccentContext"

const TABS = [
  { path: "/dashboard", label: "Home", icon: HomeIcon },
  { path: "/capture", label: "Capture", icon: CameraIcon },
  { path: "/notes", label: "Notes", icon: NotesIcon },
  { path: "/quiz", label: "Quiz", icon: QuizIcon },
  { path: "/profile", label: "Profile", icon: ProfileIcon },
]

const REST_WIDTH = 48
const DRAG_WIDTH = 64

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const navRef = useRef<HTMLDivElement>(null)
  const { color } = useAccent()
  const [dragging, setDragging] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [snapTo, setSnapTo] = useState<number | null>(null)

  const rawX = useMotionValue(0)
  const pillX = useSpring(rawX, { stiffness: 700, damping: 45, mass: 0.4 })
  const rawWidth = useMotionValue(REST_WIDTH)
  const pillWidth = useSpring(rawWidth, { stiffness: 500, damping: 40 })

  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  const activeIdx = TABS.findIndex((t) => pathname === t.path || pathname.startsWith(t.path + "/"))

  function tabWidthOf(navRect: DOMRect) {
    return navRect.width / TABS.length
  }

  function centerXFor(navRect: DOMRect, idx: number) {
    const tw = tabWidthOf(navRect)
    return tw * idx + tw / 2
  }

  function idxFromClientX(navRect: DOMRect, clientX: number) {
    const relX = clientX - navRect.left
    const tw = tabWidthOf(navRect)
    return Math.max(0, Math.min(TABS.length - 1, Math.floor(relX / tw)))
  }

  useEffect(() => {
    if (dragging) return
    const navRect = navRef.current?.getBoundingClientRect()
    if (!navRect || activeIdx < 0) return
    rawX.set(centerXFor(navRect, activeIdx) - REST_WIDTH / 2)
    rawWidth.set(REST_WIDTH)
    setHoverIdx(null)
  }, [activeIdx, dragging])

  function updatePillToClientX(navRect: DOMRect, clientX: number) {
    const halfDrag = DRAG_WIDTH / 2
    const clamped = Math.max(navRect.left + halfDrag, Math.min(navRect.right - halfDrag, clientX))
    rawX.set(clamped - navRect.left - halfDrag)
    setHoverIdx(idxFromClientX(navRect, clientX))
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return
    const navRect = navRef.current?.getBoundingClientRect()
    if (!navRect) return
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    rawWidth.set(DRAG_WIDTH)
    updatePillToClientX(navRect, e.clientX)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const navRect = navRef.current?.getBoundingClientRect()
    if (!navRect) return
    updatePillToClientX(navRect, e.clientX)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging) return
    setDragging(false)

    const navRect = navRef.current?.getBoundingClientRect()
    if (!navRect) return
    const resolved = idxFromClientX(navRect, e.clientX)

    rawWidth.set(REST_WIDTH)
    rawX.set(centerXFor(navRect, resolved) - REST_WIDTH / 2)
    setHoverIdx(null)

    setSnapTo(resolved)
    router.push(TABS[resolved].path)
    setTimeout(() => setSnapTo(null), 300)
  }

  const highlightIdx = dragging ? hoverIdx : snapTo !== null ? snapTo : activeIdx

  return (
    <motion.nav
      ref={navRef}
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      className="bottom-nav"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { setDragging(false); setHoverIdx(null) }}
      style={{
        position: "relative",
        background: `rgba(${r}, ${g}, ${b}, 0.08)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
        boxShadow: `0 8px 32px rgba(${r}, ${g}, ${b}, 0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)`,
        touchAction: "none",
      }}
    >
      <motion.div
        className="nav-active-pill"
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: pillX,
          width: pillWidth,
          background: dragging
            ? `rgba(${r}, ${g}, ${b}, 0.18)`
            : `rgba(${r}, ${g}, ${b}, 0.12)`,
          borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
          boxShadow: `0 4px 16px rgba(${r}, ${g}, ${b}, 0.15), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.03)`,
          pointerEvents: "none",
        }}
      />

      {TABS.map((tab, i) => {
        const isHighlighted = highlightIdx === i
        return (
          <Link key={tab.path} href={tab.path} style={{ flex: 1, display: "flex", justifyContent: "center", textDecoration: "none", position: "relative", zIndex: 1 }}
            onClick={(e) => { if (dragging) e.preventDefault() }}>
            <motion.div whileTap={dragging ? {} : { scale: 0.85 }} className="bottom-nav-item-inner">
              <motion.div
                className="bottom-nav-icon"
                animate={{ color: isHighlighted ? color : "#888" }}
                transition={{ duration: 0.15 }}
              >
                <tab.icon />
              </motion.div>
              <motion.span
                className="bottom-nav-label"
                animate={{
                  color: isHighlighted ? color : "#999",
                  opacity: isHighlighted ? 1 : 0.7,
                }}
                transition={{ duration: 0.15 }}
              >
                {tab.label}
              </motion.span>
            </motion.div>
          </Link>
        )
      })}
    </motion.nav>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function QuizIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}
