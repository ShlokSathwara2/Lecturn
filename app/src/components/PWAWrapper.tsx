"use client"
import PWARegister from "@/components/PWARegister"
import BottomNav from "@/components/BottomNav"
import TouchParticles from "@/components/TouchParticles"
import Onboarding from "@/components/Onboarding"
import { AccentProvider } from "@/lib/AccentContext"
import { ThemeProvider } from "@/lib/ThemeContext"

export default function PWAClientWrapper() {
  return (
    <ThemeProvider>
      <AccentProvider>
        <PWARegister />
        <Onboarding />
        <TouchParticles />
        <BottomNav />
      </AccentProvider>
    </ThemeProvider>
  )
}
