import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { brandingApi } from '../api/branding'

const ANIMATION_CACHE_KEY = 'cabinet_animation_enabled'

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

export default function AnimatedBackground() {
  // Start with cached value (null means unknown yet)
  const [isEnabled, setIsEnabled] = useState<boolean | null>(() => getCachedAnimationEnabled())

  const { data: animationSettings } = useQuery({
    queryKey: ['animation-enabled'],
    queryFn: brandingApi.getAnimationEnabled,
    staleTime: 1000 * 60, // 1 minute - быстрее обновляется при изменении админом
    refetchOnWindowFocus: true, // Обновить при возврате в окно
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

  // Don't render anything until we know the state (from cache or server)
  // If cache says disabled, don't render
  // If cache is null (first visit), default to not showing to avoid flash
  if (isEnabled !== true) {
    return null
  }

  return (
    <>
      {/* SVG Filter for glow effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>

      {/* Animated wave gradients */}
      <div className="wave-bg-container">
        <div className="wave-blob wave-blob-1" />
        <div className="wave-blob wave-blob-2" />
        <div className="wave-blob wave-blob-3" />
        <div className="wave-blob wave-blob-4" />
      </div>

      <style>{`
        .wave-bg-container {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
          background: transparent;
        }

        .wave-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          mix-blend-mode: screen;
        }

        .wave-blob-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(249, 115, 22, 0.8) 0%, transparent 70%);
          top: -20%;
          left: -10%;
          animation: wave1 15s ease-in-out infinite;
        }

        .wave-blob-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, transparent 70%);
          bottom: -15%;
          right: -10%;
          animation: wave2 18s ease-in-out infinite;
        }

        .wave-blob-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: wave3 20s ease-in-out infinite;
        }

        .wave-blob-4 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, transparent 70%);
          bottom: 20%;
          left: 20%;
          animation: wave4 12s ease-in-out infinite;
        }

        @keyframes wave1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(10%, 15%) scale(1.1);
          }
          50% {
            transform: translate(5%, 25%) scale(0.95);
          }
          75% {
            transform: translate(-5%, 10%) scale(1.05);
          }
        }

        @keyframes wave2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(-15%, -10%) scale(1.15);
          }
          50% {
            transform: translate(-10%, -20%) scale(0.9);
          }
          75% {
            transform: translate(5%, -5%) scale(1.1);
          }
        }

        @keyframes wave3 {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          33% {
            transform: translate(-40%, -60%) scale(1.2);
          }
          66% {
            transform: translate(-60%, -40%) scale(0.85);
          }
        }

        @keyframes wave4 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(20%, -15%) scale(1.25);
          }
        }

        /* Dark theme - brighter */
        :root.dark .wave-blob {
          opacity: 0.5;
        }

        :root.dark .wave-blob-1 {
          background: radial-gradient(circle, rgba(249, 115, 22, 0.7) 0%, transparent 70%);
        }

        :root.dark .wave-blob-2 {
          background: radial-gradient(circle, rgba(59, 130, 246, 0.7) 0%, transparent 70%);
        }

        :root.dark .wave-blob-3 {
          background: radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, transparent 70%);
        }

        :root.dark .wave-blob-4 {
          background: radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%);
        }

        /* Light theme - visible */
        :root:not(.dark) .wave-blob {
          opacity: 0.7;
          mix-blend-mode: multiply;
          filter: blur(100px);
        }

        :root:not(.dark) .wave-blob-1 {
          background: radial-gradient(circle, rgba(249, 115, 22, 0.9) 0%, transparent 70%);
        }

        :root:not(.dark) .wave-blob-2 {
          background: radial-gradient(circle, rgba(59, 130, 246, 0.9) 0%, transparent 70%);
        }

        :root:not(.dark) .wave-blob-3 {
          background: radial-gradient(circle, rgba(168, 85, 247, 0.7) 0%, transparent 70%);
        }

        :root:not(.dark) .wave-blob-4 {
          background: radial-gradient(circle, rgba(236, 72, 153, 0.6) 0%, transparent 70%);
        }
      `}</style>
    </>
  )
}
