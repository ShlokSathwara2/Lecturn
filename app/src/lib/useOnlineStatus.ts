"use client"

import { useState, useEffect } from "react"

export function useOnlineStatus() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const go = () => setOnline(true)
    const goff = () => setOnline(false)
    window.addEventListener("online", go)
    window.addEventListener("offline", goff)
    return () => {
      window.removeEventListener("online", go)
      window.removeEventListener("offline", goff)
    }
  }, [])

  return online
}
