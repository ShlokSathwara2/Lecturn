"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { usageLog } from "@/lib/api"

interface ProviderInfo {
  provider: string
  label: string
  total_14d: number
  today: number
  daily_limit: number
  percent_today: number | null
  near_limit: boolean
}

export default function UsagePage() {
  const router = useRouter()
  const supabase = createClient()

  const [data, setData] = useState<{
    days: string[]
    daily: Record<string, Record<string, number>>
    providers: ProviderInfo[]
    today_providers: string[]
    today_total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth"); return }
      usageLog.summary(14).then(setData).finally(() => setLoading(false))
    })
  }, [])

  if (loading) return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", minHeight: "100dvh" }}>
      <p style={{ fontSize: 14, color: "#606060", fontFamily: "var(--font-mono)" }}>Loading...</p>
    </main>
  )

  if (!data) return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", minHeight: "100dvh" }}>
      <p style={{ fontSize: 14, color: "#606060" }}>Failed to load usage data.</p>
    </main>
  )

  const visionProviders = data.providers.filter(p => !["from_cache", "duplicate", "error", "enrichment_only"].includes(p.provider))
  const systemProviders = data.providers.filter(p => ["from_cache", "duplicate", "error", "enrichment_only"].includes(p.provider))

  return (
    <main style={{ padding: 16, fontFamily: "var(--font-body)", maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, minHeight: "100dvh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/dashboard")} style={{ fontSize: 22, color: "#909090", padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a2a", lineHeight: 1, minWidth: 44, minHeight: 44 }}>
          &larr;
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>API Usage</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: "#1a2a3a", border: "1px solid #3b82f6" }}>
        <span style={{ fontSize: 18 }}>&#x1F4CA;</span>
        <div>
          <p style={{ fontSize: 14, color: "#e8e8e8" }}>Today: <strong>{data.today_total}</strong> request{data.today_total !== 1 ? "s" : ""}</p>
          {data.today_providers.length > 0 && (
            <p style={{ fontSize: 12, color: "#909090", fontFamily: "var(--font-mono)", marginTop: 2 }}>
              {data.today_providers.join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, color: "#909090", fontFamily: "var(--font-mono)", marginBottom: 8 }}>VISION PROVIDERS (14-day total)</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visionProviders.map((p) => (
            <ProviderCard key={p.provider} p={p} today={data.today_providers.includes(p.provider)} />
          ))}
          {visionProviders.length === 0 && (
            <p style={{ fontSize: 13, color: "#606060", padding: 12 }}>No vision API calls recorded yet.</p>
          )}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, color: "#909090", fontFamily: "var(--font-mono)", marginBottom: 8 }}>SYSTEM</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {systemProviders.map((p) => (
            <ProviderCard key={p.provider} p={p} compact />
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, color: "#909090", fontFamily: "var(--font-mono)", marginBottom: 8 }}>DAILY BREAKDOWN</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {data.days.map((d) => {
            const dayData = data.daily[d] || {}
            const total = Object.values(dayData).reduce((s: number, v: number) => s + v, 0)
            const parts = Object.entries(dayData)
              .sort((a, b) => (PROVIDER_ORDER.indexOf(a[0]) - PROVIDER_ORDER.indexOf(b[0])))
            return (
              <div key={d} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "#1a1a1a" }}>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#909090", minWidth: 80 }}>{d === new Date().toISOString().slice(0, 10) ? "Today" : d}</span>
                <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {parts.map(([prov, count]) => {
                    const color = PROVIDER_COLORS[prov] || "#606060"
                    return <span key={prov} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color, background: `${color}15`, padding: "2px 8px", borderRadius: 4 }}>
                      {prov}:{count}
                    </span>
                  })}
                </div>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#e8e8e8", whiteSpace: "nowrap" }}>{total}</span>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}

const PROVIDER_ORDER = ["gemini", "openrouter-primary", "openrouter-fallback", "enrichment_only", "from_cache", "duplicate", "error"]

const PROVIDER_COLORS: Record<string, string> = {
  "gemini": "#4285f4",
  "openrouter-primary": "#3b82f6",
  "openrouter-fallback": "#f59e0b",
  "enrichment_only": "#059669",
  "from_cache": "#6b7280",
  "duplicate": "#8b5cf6",
  "error": "#ef4444",
}

function ProviderCard({ p, today, compact }: { p: ProviderInfo; today?: boolean; compact?: boolean }) {
  const limitBar = p.percent_today != null ? Math.min(p.percent_today, 100) : null
  return (
    <div style={{ padding: compact ? "8px 12px" : "12px 16px", borderRadius: 10, background: p.near_limit ? "#2a1a1a" : "#1a1a1a", border: `1px solid ${p.near_limit ? "#ef4444" : today ? "#3b82f6" : "#2a2a2a"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: compact ? 0 : 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: PROVIDER_COLORS[p.provider] || "#606060", flexShrink: 0 }} />
          <p style={{ fontSize: 14, fontWeight: 500 }}>{compact ? p.label : p.label}</p>
          {today && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#3b82f6", color: "#fff" }}>TODAY</span>}
          {p.near_limit && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#ef4444", color: "#fff" }}>NEAR LIMIT</span>}
        </div>
        {!compact && <p style={{ fontSize: 13, color: "#e8e8e8", fontFamily: "var(--font-mono)" }}>
          {p.today} / {p.daily_limit < 9999 ? p.daily_limit : "\u221E"} <span style={{ color: "#606060" }}>today</span>
        </p>}
      </div>
      {!compact && limitBar != null && (
        <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "#2a2a2a", overflow: "hidden" }}>
          <div style={{ width: `${limitBar}%`, height: "100%", borderRadius: 2, background: p.near_limit ? "#ef4444" : "#3b82f6" }} />
        </div>
      )}
      {!compact && <p style={{ fontSize: 11, color: "#606060", fontFamily: "var(--font-mono)", marginTop: 4 }}>
        {p.total_14d} total in 14 days
      </p>}
    </div>
  )
}
