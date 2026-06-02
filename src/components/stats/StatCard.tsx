import { type ReactNode } from 'react';

import { TREND_STYLES } from './constants';

const DEFAULT_VALUE_CLASS = 'text-dark-100';

export interface StatCardDelta {
  /** Signed percent change vs the comparison period. */
  percent: number;
  trend: 'up' | 'down' | 'stable';
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  valueClassName?: string;
  /** Optional period-over-period change shown next to the value. */
  delta?: StatCardDelta | null;
}

export function StatCard({
  label,
  value,
  icon,
  valueClassName = DEFAULT_VALUE_CLASS,
  delta,
}: StatCardProps) {
  const trendStyle = delta ? (TREND_STYLES[delta.trend] ?? TREND_STYLES.stable) : null;

  return (
    <div className="rounded-xl bg-dark-800/30 p-3">
      <div className="flex items-center gap-1.5 text-sm text-dark-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`truncate text-base font-semibold sm:text-lg ${valueClassName}`}>
          {value}
        </span>
        {trendStyle && (
          <span className={`shrink-0 text-xs font-medium ${trendStyle.className}`}>
            {trendStyle.arrow} {Math.abs(delta!.percent)}%
          </span>
        )}
      </div>
    </div>
  );
}
