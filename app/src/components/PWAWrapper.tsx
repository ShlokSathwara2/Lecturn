"use client"
import PWARegister from "@/components/PWARegister"
import BottomNav from "@/components/BottomNav"
import TouchParticles from "@/components/TouchParticles"

export default function PWAClientWrapper() {
  return (
    <>
      <PWARegister />
      <TouchParticles />
      <BottomNav />
    </>
  )
}
