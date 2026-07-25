"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { useAccent } from "@/lib/AccentContext"

const TABS = [
  { path: "/dashboard", label: "Home", icon: HomeIcon },
  { path: "/capture", label: "Capture", icon: CameraIcon },
  { path: "/notes", label: "Notes", icon: NotesIcon },
  { path: "/quiz", label: "Quiz", icon: QuizIcon },
  { path: "/profile", label: "Profile", icon: ProfileIcon },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { color } = useAccent()

  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      className="bottom-nav"
      style={{
        background: `rgba(${r}, ${g}, ${b}, 0.08)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
        boxShadow: `0 8px 32px rgba(${r}, ${g}, ${b}, 0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)`,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.path || pathname.startsWith(tab.path + "/")
        return (
          <Link key={tab.path} href={tab.path} style={{ flex: 1, display: "flex", justifyContent: "center", textDecoration: "none" }}>
            <motion.div whileTap={{ scale: 0.85 }} className="bottom-nav-item-inner">
              <motion.div
                className="bottom-nav-icon"
                animate={{ color: active ? color : "#888" }}
                transition={{ duration: 0.25 }}
              >
                {active && (
                  <motion.div
                    layoutId="nav-glass"
                    className="nav-active-pill"
                    style={{
                      background: `rgba(${r}, ${g}, ${b}, 0.12)`,
                      borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
                      boxShadow: `0 4px 16px rgba(${r}, ${g}, ${b}, 0.15), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.03)`,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <tab.icon />
              </motion.div>
              <motion.span
                className="bottom-nav-label"
                animate={{
                  color: active ? color : "#999",
                  opacity: active ? 1 : 0.7,
                }}
                transition={{ duration: 0.25 }}
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
