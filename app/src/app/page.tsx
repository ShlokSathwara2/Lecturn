"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import Link from "next/link"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/auth")
  }

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#666" }}>Loading...</p>
      </main>
    )
  }

  if (!user) {
    router.push("/auth")
    return null
  }

  return (
    <main style={{ padding: 24, fontFamily: "var(--font-body)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>SlideScribe</h1>
          <p style={{ fontSize: 13, color: "#909090", fontFamily: "var(--font-mono)", marginTop: 4 }}>
            {user.email}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8, border: "1px solid #2a2a2a", color: "#909090" }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link
          href="/capture"
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#3b82f6",
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Capture Slide
        </Link>
        <Link
          href="/dashboard"
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#e8e8e8",
            fontSize: 16,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Dashboard
        </Link>
      </div>
    </main>
  )
}
