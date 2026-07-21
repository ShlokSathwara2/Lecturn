"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <main style={{ padding: 24, maxWidth: 400, margin: "0 auto", paddingTop: "30vh" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Check your email</h1>
        <p style={{ color: "#909090", lineHeight: 1.6 }}>
          We sent a magic link to <strong style={{ color: "#e8e8e8" }}>{email}</strong>.
          Click the link in the email to sign in.
        </p>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 400, margin: "0 auto", paddingTop: "25vh" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>SlideScribe</h1>
      <p style={{ color: "#909090", marginBottom: 32, fontSize: 14 }}>
        Sign in with your email
      </p>

      <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #2a2a2a",
            background: "#1a1a1a",
            fontSize: 16,
            outline: "none",
          }}
        />

        {error && (
          <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            background: "#3b82f6",
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Sending..." : "Sign In with Email"}
        </button>
      </form>
    </main>
  )
}
