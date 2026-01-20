import { useEffect, useRef, useState, useCallback } from 'react'

interface UsePullToRefreshOptions {
  onRefresh?: () => void | Promise<void>
  threshold?: number // How far to pull before triggering refresh (px)
  disabled?: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions = {}) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const startY = useRef(0)
  const currentY = useRef(0)

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    } else {
      // Default: reload the page
      window.location.reload()
    }
  }, [onRefresh])

  useEffect(() => {
    if (disabled) return

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY > 5) return

      startY.current = e.touches[0].clientY
      currentY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === 0) return
      if (window.scrollY > 5) {
        // User scrolled down, reset
        startY.current = 0
        setPullDistance(0)
        setIsPulling(false)
        return
      }

      currentY.current = e.touches[0].clientY
      const diff = currentY.current - startY.current

      // Only track downward pulls
      if (diff > 0) {
        // Apply resistance - pull distance is less than actual finger movement
        const resistance = 0.4
        const distance = Math.min(diff * resistance, threshold * 1.5)
        setPullDistance(distance)
        setIsPulling(true)

        // Prevent default scroll if we're pulling
        if (distance > 10) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = () => {
      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh()
      }

      startY.current = 0
      setPullDistance(0)
      setIsPulling(false)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [disabled, threshold, pullDistance, isRefreshing, handleRefresh])

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    progress: Math.min(pullDistance / threshold, 1),
  }
}
