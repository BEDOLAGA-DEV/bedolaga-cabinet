import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

interface OnboardingStep {
  target: string // data-onboarding attribute value
  title: string
  description: string
  placement: 'top' | 'bottom' | 'left' | 'right'
}

interface OnboardingProps {
  steps: OnboardingStep[]
  onComplete: () => void
  onSkip: () => void
}

const STORAGE_KEY = 'onboarding_completed'

export function useOnboarding() {
  const [isCompleted, setIsCompleted] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsCompleted(true)
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setIsCompleted(false)
  }, [])

  return { isCompleted, complete, reset }
}

export default function Onboarding({ steps, onComplete, onSkip }: OnboardingProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const step = steps[currentStep]

  // Find and highlight target element
  useEffect(() => {
    const findTarget = () => {
      const target = document.querySelector(`[data-onboarding="${step.target}"]`)
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetRect(rect)

        // Scroll element into view if needed
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Delay visibility for smooth animation
        setTimeout(() => setIsVisible(true), 100)
      }
    }

    setIsVisible(false)
    const timer = setTimeout(findTarget, 300)
    return () => clearTimeout(timer)
  }, [step.target])

  // Recalculate position on resize/scroll
  useEffect(() => {
    const updatePosition = () => {
      const target = document.querySelector(`[data-onboarding="${step.target}"]`)
      if (target) {
        setTargetRect(target.getBoundingClientRect())
      }
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [step.target])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0 }

    const padding = 16
    const tooltipWidth = 320
    const tooltipHeight = tooltipRef.current?.offsetHeight || 150

    let top = 0
    let left = 0

    switch (step.placement) {
      case 'bottom':
        top = targetRect.bottom + padding
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'top':
        top = targetRect.top - tooltipHeight - padding
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.left - tooltipWidth - padding
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.right + padding
        break
    }

    // Keep within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (left < padding) left = padding
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding
    }
    if (top < padding) top = padding
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding
    }

    return {
      top,
      left,
      width: tooltipWidth,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1)' : 'scale(0.95)',
    }
  }

  // Spotlight style
  const getSpotlightStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0 }

    const padding = 8
    return {
      top: targetRect.top - padding,
      left: targetRect.left - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
      opacity: isVisible ? 1 : 0,
    }
  }

  return createPortal(
    <div className="onboarding-overlay" style={{ opacity: isVisible ? 1 : 0 }}>
      {/* Spotlight */}
      <div className="onboarding-spotlight" style={getSpotlightStyle()} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`onboarding-tooltip tooltip-${step.placement}`}
        style={getTooltipStyle()}
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((s, index) => (
            <div
              key={s.target}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-6 bg-accent-500'
                  : index < currentStep
                  ? 'w-2 bg-accent-500/50'
                  : 'w-2 bg-dark-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-dark-50 mb-2">{step.title}</h3>
        <p className="text-dark-400 text-sm mb-5">{step.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-dark-500 hover:text-dark-300 text-sm transition-colors"
          >
            {t('onboarding.skip', 'Skip')}
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button onClick={handlePrev} className="btn-ghost text-sm px-3 py-1.5">
                {t('common.back', 'Back')}
              </button>
            )}
            <button onClick={handleNext} className="btn-primary text-sm px-4 py-1.5">
              {currentStep === steps.length - 1
                ? t('onboarding.finish', 'Finish')
                : t('common.next', 'Next')}
            </button>
          </div>
        </div>
      </div>

      {/* Click handler to advance on target click */}
      {targetRect && (
        <div
          className="absolute cursor-pointer"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
          onClick={handleNext}
        />
      )}
    </div>,
    document.body
  )
}
