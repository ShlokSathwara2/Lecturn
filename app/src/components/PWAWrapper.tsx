"use client"
import PWARegister from "@/components/PWARegister"
import BottomNav from "@/components/BottomNav"
import TouchParticles from "@/components/TouchParticles"
import { AccentProvider } from "@/lib/AccentContext"

export default function PWAClientWrapper() {
  return (
    <AccentProvider>
      <PWARegister />
      <TouchParticles />
      <BottomNav />
    </AccentProvider>
  )
}
