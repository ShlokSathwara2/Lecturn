"use client"

import { createContext, useContext, useState, useEffect } from "react"

type AccentContext = {
  color: string
  setColor: (c: string) => void
}

const AccentCtx = createContext<AccentContext>({ color: "#3b82f6", setColor: () => {} })

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [color, setColor] = useState("#3b82f6")
  return (
    <AccentCtx.Provider value={{ color, setColor }}>
      {children}
    </AccentCtx.Provider>
  )
}

export function useAccent() {
  return useContext(AccentCtx)
}

export function usePageAccent(color: string) {
  const { setColor } = useAccent()
  useEffect(() => {
    setColor(color)
    return () => setColor("#3b82f6")
  }, [color, setColor])
}
