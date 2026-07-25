"use client"

import { createContext, useContext, useState, useEffect } from "react"

type Theme = "dark" | "light"

type ThemeContext = {
  theme: Theme
  toggle: () => void
}

const ThemeCtx = createContext<ThemeContext>({ theme: "dark", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const saved = localStorage.getItem("lecturn-theme") as Theme | null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("lecturn-theme", theme)
  }, [theme])

  function toggle() {
    setTheme((t) => (t === "dark" ? "light" : "dark"))
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeCtx)
}
