import { useEffect, useState, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { brandingApi } from '../api/branding'

const ANIMATION_CACHE_KEY = 'cabinet_animation_enabled'

// Detect if user prefers reduced motion
const isLowPerformance = (): boolean => {
  // Only check for reduced motion preference - let animation run everywhere else
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return prefersReducedMotion
}

// Get cached value from localStorage
const getCachedAnimationEnabled = (): boolean | null => {
  try {
    const cached = localStorage.getItem(ANIMATION_CACHE_KEY)
    if (cached !== null) {
      return cached === 'true'
    }
  } catch {
    // localStorage not available
  }
  return null
}

// Update cache in localStorage
export const setCachedAnimationEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(ANIMATION_CACHE_KEY, String(enabled))
  } catch {
    // localStorage not available
  }
}

// Memoized background component to prevent re-renders
const AnimatedBackground = memo(function AnimatedBackground() {
  // Start with cached value (null means unknown yet)
  const [isEnabled, setIsEnabled] = useState<boolean | null>(() => getCachedAnimationEnabled())
  const [isLowPerf] = useState(() => isLowPerformance())

  const { data: animationSettings } = useQuery({
    queryKey: ['animation-enabled'],
    queryFn: brandingApi.getAnimationEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - reduce API calls
    refetchOnWindowFocus: false, // Don't refetch on focus - save resources
    retry: false,
  })

  // Update state and cache when data arrives
  useEffect(() => {
    if (animationSettings !== undefined) {
      const enabled = animationSettings.enabled
      setIsEnabled(enabled)
      setCachedAnimationEnabled(enabled)
    }
  }, [animationSettings])

  // Don't render if disabled or on low-performance devices
  if (isEnabled !== true || isLowPerf) {
    return null
  }

  // Render only 2 blobs on mobile for better performance
  const isMobile = window.innerWidth < 768

  return (
    <div className="wave-bg-container">
      <div className="wave-blob wave-blob-1" />
      <div className="wave-blob wave-blob-2" />
      {!isMobile && (
        <>
          <div className="wave-blob wave-blob-3" />
          <div className="wave-blob wave-blob-4" />
        </>
      )}
    </div>
  )
})

export default AnimatedBackground
