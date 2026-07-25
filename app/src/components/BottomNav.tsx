"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import { useAccent } from "@/lib/AccentContext"

const TABS = [
  { path: "/dashboard", label: "Home", icon: HomeIcon },
  { path: "/capture", label: "Capture", icon: CameraIcon },
  { path: "/notes", label: "Notes", icon: NotesIcon },
  { path: "/quiz", label: "Quiz", icon: QuizIcon },
  { path: "/profile", label: "Profile", icon: ProfileIcon },
]

const PILL_W = 48

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const navRef = useRef<HTMLDivElement>(null)
  const { color } = useAccent()
  const [dragging, setDragging] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [pillLeft, setPillLeft] = useState(0)
  const pillRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const activeIdx = useMemo(
    () => TABS.findIndex((t) => pathname === t.path || pathname.startsWith(t.path + "/")),
    [pathname]
  )

  const r = useMemo(() => parseInt(color.slice(1, 3), 16), [color])
  const g = useMemo(() => parseInt(color.slice(3, 5), 16), [color])
  const b = useMemo(() => parseInt(color.slice(5, 7), 16), [color])

  const tabWidth = useCallback(() => {
    const nav = navRef.current
    if (!nav) return 60
    return nav.getBoundingClientRect().width / TABS.length
  }, [])

  const centerOf = useCallback((idx: number) => {
    return tabWidth() * idx + tabWidth() / 2 - PILL_W / 2
  }, [tabWidth])

  const idxFromX = useCallback((clientX: number) => {
    const nav = navRef.current
    if (!nav) return 0
    const rect = nav.getBoundingClientRect()
    const relX = clientX - rect.left
    return Math.max(0, Math.min(TABS.length - 1, Math.floor(relX / tabWidth())))
  }, [tabWidth])

  useEffect(() => {
    if (!dragging) {
      setPillLeft(centerOf(activeIdx))
      setHoverIdx(null)
    }
  }, [activeIdx, dragging, centerOf])

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return
    setDragging(true)
    setHoverIdx(idxFromX(e.clientX))
    setPillLeft(centerOf(idxFromX(e.clientX)))
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const nav = navRef.current
      if (!nav) return
      const rect = nav.getBoundingClientRect()
      const halfDrag = PILL_W / 2 + 8
      const clamped = Math.max(rect.left + halfDrag, Math.min(rect.right - halfDrag, e.clientX))
      setPillLeft(clamped - rect.left - PILL_W / 2)
      setHoverIdx(idxFromX(e.clientX))
    })
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging) return
    setDragging(false)
    const resolved = idxFromX(e.clientX)
    setPillLeft(centerOf(resolved))
    setHoverIdx(null)
    router.push(TABS[resolved].path)
  }

  const highlightIdx = dragging ? hoverIdx ?? activeIdx : activeIdx

  const pillStyle = useMemo(() => ({
    position: "absolute" as const,
    top: 4,
    bottom: 4,
    width: PILL_W,
    borderRadius: 24,
    background: dragging
      ? `rgba(${r}, ${g}, ${b}, 0.22)`
      : `rgba(${r}, ${g}, ${b}, 0.12)`,
    boxShadow: `0 2px 12px rgba(${r}, ${g}, ${b}, 0.12), inset 0 1px 0 rgba(255,255,255,0.8)`,
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.15)`,
    pointerEvents: "none" as const,
    transition: dragging ? "none" : "left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
    willChange: "left",
  }), [r, g, b, dragging])

  return (
    <nav
      ref={navRef}
      className="bottom-nav"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { setDragging(false); setHoverIdx(null) }}
      style={{
        background: `rgba(${r}, ${g}, ${b}, 0.08)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
        boxShadow: `0 8px 32px rgba(${r}, ${g}, ${b}, 0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)`,
        touchAction: "none",
      }}
    >
      <div ref={pillRef} className="nav-active-pill" style={pillStyle} />

      {TABS.map((tab, i) => {
        const isHighlighted = highlightIdx === i
        return (
          <Link key={tab.path} href={tab.path}
            style={{ flex: 1, display: "flex", justifyContent: "center", textDecoration: "none", position: "relative", zIndex: 1 }}
            onClick={(e) => { if (dragging) e.preventDefault() }}>
            <div className="bottom-nav-item-inner">
              <div
                className="bottom-nav-icon"
                style={{
                  color: isHighlighted ? color : "#888",
                  transition: "color 0.15s ease",
                }}
              >
                <tab.icon />
              </div>
              <span
                className="bottom-nav-label"
                style={{
                  color: isHighlighted ? color : "#999",
                  opacity: isHighlighted ? 1 : 0.7,
                  transition: "color 0.15s ease, opacity 0.15s ease",
                }}
              >
                {tab.label}
              </span>
            </div>
          </Link>
        )
      })}
    </nav>
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
