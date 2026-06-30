import { type ReactNode } from 'react';

import { TREND_STYLES } from './constants';

export interface StatCardDelta {
  /** Signed percent change vs the comparison period. */
  percent: number;
  trend: 'up' | 'down' | 'stable';
}

/** Soft tinted chip + matching value colour, in the spirit of the Remnawave stats. */
const TONE = {
  neutral: { chip: 'bg-dark-700/60 text-dark-300', value: 'text-dark-100' },
  success: { chip: 'bg-success-500/15 text-success-400', value: 'text-success-400' },
  accent: { chip: 'bg-accent-500/15 text-accent-400', value: 'text-accent-400' },
  warning: { chip: 'bg-warning-500/15 text-warning-400', value: 'text-warning-400' },
  error: { chip: 'bg-error-500/15 text-error-400', value: 'text-error-400' },
} as const;

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  /** Tints the icon chip and (unless valueClassName is set) the value colour. */
  tone?: keyof typeof TONE;
  valueClassName?: string;
  /** Optional secondary line shown under the value (e.g. a subtitle or context). */
  subValue?: string;
  /** When true, shows a skeleton placeholder instead of the value. */
  loading?: boolean;
  /** Optional node rendered at the right edge of the label row (e.g. a chevron for nav cards). */
  trailing?: ReactNode;
  /** Optional period-over-period change shown under the value. */
  delta?: StatCardDelta | null;
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  valueClassName,
  subValue,
  loading,
  trailing,
  delta,
}: StatCardProps) {
  const toneStyle = TONE[tone];
  const valueClass = valueClassName ?? toneStyle.value;
  const trendStyle = delta ? (TREND_STYLES[delta.trend] ?? TREND_STYLES.stable) : null;

  return (
    <div className="h-full rounded-xl bg-dark-800/30 p-3 transition-colors hover:bg-dark-800/50">
      <div className="flex items-center justify-between gap-2">
        <span className="line-clamp-2 text-xs leading-tight text-dark-500 sm:text-sm">{label}</span>
        {trailing}
      </div>
      {/* Chip is centred against the value line only (delta sits below the whole
          row), so the icon lands in the same spot on every card. The forced svg
          size normalises every icon regardless of what the call site passes. */}
      <div className="mt-1.5 flex items-center gap-2.5">
        {icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-5 [&>svg]:w-5 ${toneStyle.chip}`}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="skeleton h-7 w-20 rounded" />
          ) : (
            <>
              <div className={`truncate text-lg font-semibold sm:text-xl ${valueClass}`}>
                {value}
              </div>
              {subValue && <div className="truncate text-xs text-dark-500">{subValue}</div>}
            </>
          )}
        </div>
      </div>
      {trendStyle && (
        <div className={`mt-1.5 text-xs font-medium ${trendStyle.className}`}>
          {trendStyle.arrow} {Math.abs(delta!.percent)}%
        </div>
      )}
    </div>
  );
}
