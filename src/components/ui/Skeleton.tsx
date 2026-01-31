import { type CSSProperties } from 'react';

export type SkeletonVariant = 'text' | 'avatar' | 'card' | 'list' | 'bento';

export interface SkeletonProps {
  /**
   * Variant of skeleton
   * - text: Single line of text
   * - avatar: Circular avatar
   * - card: Full card with header and content
   * - list: Multiple list items
   * - bento: Bento card style (original BentoSkeleton)
   */
  variant?: SkeletonVariant;
  /**
   * Number of skeleton items to render
   */
  count?: number;
  /**
   * Width (for text variant)
   */
  width?: string | number;
  /**
   * Height (for custom sizing)
   */
  height?: string | number;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to animate
   * @default true
   */
  animate?: boolean;
}

const baseClasses = 'bg-dark-800/50 rounded';
const animateClasses = 'animate-pulse';

export function Skeleton({
  variant = 'text',
  count = 1,
  width,
  height,
  className = '',
  animate = true,
}: SkeletonProps) {
  const animation = animate ? animateClasses : '';

  const renderSkeleton = (index: number) => {
    const style: CSSProperties = {
      '--stagger': index,
      width: width,
      height: height,
    } as CSSProperties;

    switch (variant) {
      case 'text':
        return (
          <div
            key={index}
            className={`${baseClasses} ${animation} h-4 ${className}`}
            style={{ ...style, width: width ?? '100%' }}
          />
        );

      case 'avatar':
        return (
          <div
            key={index}
            className={`${baseClasses} ${animation} rounded-full ${className}`}
            style={{ ...style, width: width ?? 40, height: height ?? 40 }}
          />
        );

      case 'card':
        return (
          <div
            key={index}
            className={`${baseClasses} ${animation} rounded-[var(--bento-radius,24px)] border border-dark-700/30 p-4 ${className}`}
            style={style}
          >
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-dark-700/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-dark-700/50" />
                <div className="h-3 w-1/2 rounded bg-dark-700/50" />
              </div>
            </div>
            {/* Content */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-dark-700/50" />
              <div className="h-3 w-5/6 rounded bg-dark-700/50" />
              <div className="h-3 w-4/6 rounded bg-dark-700/50" />
            </div>
          </div>
        );

      case 'list':
        return (
          <div
            key={index}
            className={`${baseClasses} ${animation} flex items-center gap-3 p-3 ${className}`}
            style={style}
          >
            <div className="h-10 w-10 shrink-0 rounded-lg bg-dark-700/50" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-dark-700/50" />
              <div className="h-3 w-1/2 rounded bg-dark-700/50" />
            </div>
          </div>
        );

      case 'bento':
      default:
        return (
          <div
            key={index}
            className={`${baseClasses} ${animation} min-h-[160px] w-full rounded-[var(--bento-radius,24px)] border border-dark-700/30 ${className}`}
            style={style}
          />
        );
    }
  };

  if (count > 1) {
    return <>{Array.from({ length: count }).map((_, i) => renderSkeleton(i))}</>;
  }

  return renderSkeleton(0);
}

// Convenience components for common use cases
export function TextSkeleton({
  lines = 1,
  className = '',
  lastLineWidth = '60%',
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? lastLineWidth : '100%'} />
      ))}
    </div>
  );
}

export function AvatarSkeleton({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return <Skeleton variant="avatar" width={size} height={size} className={className} />;
}

export function CardSkeleton({
  count = 1,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return <Skeleton variant="card" count={count} className={className} />;
}

export function ListSkeleton({
  count = 3,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Skeleton variant="list" count={count} />
    </div>
  );
}

export function BentoSkeleton({
  count = 1,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return <Skeleton variant="bento" count={count} className={className} />;
}

// Default export for backwards compatibility
export default BentoSkeleton;
