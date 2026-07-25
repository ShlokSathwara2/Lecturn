"use client"
import { usePathname } from "next/navigation"
import PWARegister from "@/components/PWARegister"
import BottomNav from "@/components/BottomNav"
import TouchParticles from "@/components/TouchParticles"
import Onboarding from "@/components/Onboarding"
import { AccentProvider } from "@/lib/AccentContext"
import { ThemeProvider } from "@/lib/ThemeContext"

const HIDE_NAV = ["/auth", "/auth/confirm", "/"]

export default function PWAClientWrapper() {
  const pathname = usePathname()
  const showNav = !HIDE_NAV.includes(pathname)

  return (
    <ThemeProvider>
      <AccentProvider>
        <PWARegister />
        <Onboarding />
        <TouchParticles />
        {showNav && <BottomNav />}
      </AccentProvider>
    </ThemeProvider>
  )
}
