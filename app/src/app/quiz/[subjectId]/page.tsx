"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { quiz as quizApi } from "@/lib/api"

interface Card {
  id: string
  chapter_id: string
  chapter_title: string
  front: string
  back: string
  key_points: string[]
}

export default function QuizPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const router = useRouter()

  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [totalStarted, setTotalStarted] = useState(0)

  useEffect(() => {
    quizApi.get(subjectId).then((data) => {
      const shuffled = data.cards.sort(() => Math.random() - 0.5)
      setCards(shuffled)
      setTotalStarted(shuffled.length)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      setDone(true)
    })
  }, [subjectId])

  function next(rating: "easy" | "hard") {
    if (rating === "hard") {
      const harder = [...cards]
      const [cur] = harder.splice(index, 1)
      const insertAt = Math.floor(Math.random() * (harder.length + 1))
      harder.splice(insertAt, 0, cur)
      setCards(harder)
    } else {
      const remaining = cards.filter((_, i) => i !== index)
      setCards(remaining)
      if (remaining.length === 0) { setDone(true); return }
      if (index >= remaining.length) setIndex(remaining.length - 1)
    }
    setRevealed(false)
  }

  if (loading) return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 16, color: "#606060" }}>Loading cards...</p>
    </main>
  )

  if (done) return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <p style={{ fontSize: 24 }}>&#x2705;</p>
      <h1 style={{ fontSize: 20, fontWeight: 600, textAlign: "center" }}>Revision complete!</h1>
      <p style={{ fontSize: 14, color: "#909090", textAlign: "center" }}>{totalStarted} cards reviewed</p>
      <button onClick={() => router.push("/dashboard")}
        style={{ padding: "14px 32px", borderRadius: 12, background: "#3b82f6", color: "#fff", fontSize: 16, fontWeight: 600 }}>
        Back to Dashboard
      </button>
    </main>
  )

  if (cards.length === 0) return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 16, color: "#606060" }}>No flashcards available for this subject. Generate AI content first.</p>
    </main>
  )

  const card = cards[index]
  const remaining = cards.length - 1

  return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => router.push("/dashboard")} style={{ fontSize: 13, color: "#909090", padding: "10px 16px", borderRadius: 10, border: "1px solid #2a2a2a", minHeight: 44 }}>
          &larr; Dashboard
        </button>
        <p style={{ fontSize: 13, color: "#606060", fontFamily: "var(--font-mono)" }}>
          {totalStarted - remaining} / {totalStarted}
        </p>
      </div>

      <p style={{ fontSize: 12, color: "#606060", fontFamily: "var(--font-mono)", textAlign: "center" }}>
        {card.chapter_title}
      </p>

      <div onClick={() => !revealed && setRevealed(true)} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", background: "#1a1a1a", borderRadius: 16, border: `1px solid ${revealed ? "#3b82f6" : "#2a2a2a"}`, padding: 24, cursor: revealed ? "default" : "pointer", minHeight: 240 }}>
        <div style={{ fontSize: 12, color: "#606060", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
          {revealed ? "ANSWER" : "QUESTION"}
        </div>
        {!revealed ? (
          <p style={{ fontSize: 18, lineHeight: 1.5, color: "#e8e8e8" }}>{card.front}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#e8e8e8", whiteSpace: "pre-wrap" }}>{card.back}</p>
            {card.key_points.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: "#3b82f6", fontFamily: "var(--font-mono)", marginBottom: 6 }}>KEY POINTS</p>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {card.key_points.map((kp, i) => (
                    <li key={i} style={{ fontSize: 13, color: "#b0b0b0", marginBottom: 4, lineHeight: 1.4 }}>{kp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {revealed && (
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => next("hard")} style={{ flex: 1, padding: "14px 24px", borderRadius: 12, border: "1px solid #f59e0b", color: "#f59e0b", fontSize: 15, fontWeight: 500, background: "transparent" }}>
            Still learning
          </button>
          <button onClick={() => next("easy")} style={{ flex: 1, padding: "14px 24px", borderRadius: 12, background: "#059669", color: "#fff", fontSize: 15, fontWeight: 500 }}>
            Got it
          </button>
        </div>
      )}

      {!revealed && (
        <p style={{ textAlign: "center", fontSize: 13, color: "#606060" }}>Tap the card to reveal</p>
      )}
    </main>
  )
}
