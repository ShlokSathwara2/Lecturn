import { useEffect, useRef } from "react"

export function useSwipe(onSwipeRight: () => void, threshold = 80) {
  const startX = useRef(0)
  const startY = useRef(0)

  useEffect(() => {
    function handleTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    }

    function handleTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - startX.current
      const dy = e.changedTouches[0].clientY - startY.current
      if (dx > threshold && Math.abs(dy) < dx * 0.5 && startX.current < 40) {
        onSwipeRight()
      }
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })
    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [onSwipeRight, threshold])
}
