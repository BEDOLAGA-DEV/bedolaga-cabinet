import React from 'react';
import { cn } from '@/lib/utils';

interface HoverBorderGradientProps extends React.HTMLAttributes<HTMLElement> {
  /** Rendered HTML element. Default: 'div' */
  as?: React.ElementType;
  /** Hex color for the rotating gradient beam (e.g. '#00E5A0') */
  accentColor?: string;
  /** Full rotation duration in seconds. Default: 3 */
  duration?: number;
  /** Disables the element (applies to interactive elements like buttons) */
  disabled?: boolean;
}

/**
 * Animated conic-gradient border that rotates around the element.
 *
 * Uses pure CSS `@property --border-angle` animation — no JS loops,
 * GPU-friendly, works in Telegram Mini App WebView.
 *
 * Fallback: browsers without `@property` show a static gradient border.
 */
export function HoverBorderGradient({
  children,
  className,
  as: Tag = 'div',
  accentColor,
  duration,
  style,
  ...props
}: HoverBorderGradientProps) {
  const cssVars: Record<string, string> = {};

  if (accentColor) {
    cssVars['--accent-color'] = accentColor;
    // 30% opacity hex suffix for hover glow
    cssVars['--accent-glow'] = accentColor + '4D';
  }

  if (duration !== undefined) {
    cssVars['--border-duration'] = `${duration}s`;
  }

  return (
    <Tag
      className={cn('hover-border-gradient', className)}
      style={{ ...cssVars, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}
