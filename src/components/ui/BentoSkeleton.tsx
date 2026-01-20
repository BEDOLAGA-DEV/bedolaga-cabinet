interface BentoSkeletonProps {
  className?: string
  count?: number
}

export default function BentoSkeleton({ className = '', count = 1 }: BentoSkeletonProps) {
  const baseClasses = `animate-pulse bg-dark-800/50 border border-dark-700/30 rounded-[var(--bento-radius,24px)] min-h-[160px] w-full ${className}`

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={baseClasses}
            style={{ '--stagger': i } as React.CSSProperties}
          />
        ))}
      </>
    )
  }

  return (
    <div
      className={baseClasses}
    />
  )
}
