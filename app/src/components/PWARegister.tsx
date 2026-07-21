"use client"

import { useEffect, useState } from "react"

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener("beforeinstallprompt", handler)

    const installedHandler = () => {
      setShowInstall(false)
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener("appinstalled", installedHandler)

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", installedHandler)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === "accepted") {
      setShowInstall(false)
      setInstalled(true)
    }
    setDeferredPrompt(null)
  }

  if (installed || !showInstall) return null

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, padding: 12, paddingBottom: 24, background: "linear-gradient(to top, #121212, transparent)", pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: "#1a2a3a", border: "1px solid #3b82f6" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e8e8" }}>Install SlideScribe</p>
          <p style={{ fontSize: 12, color: "#909090" }}>Add to home screen for the best experience</p>
        </div>
        <button onClick={handleInstall} style={{ padding: "10px 18px", borderRadius: 10, background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
          Install
        </button>
        <button onClick={() => setShowInstall(false)} style={{ padding: 8, color: "#909090", fontSize: 18, background: "transparent", border: "none" }}>
          &times;
        </button>
      </div>
    </div>
  )
}
