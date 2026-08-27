import { RISK_STYLES, formatGbPerDay, type RiskLevel } from './trafficUsageHelpers';

// ──────────────────────────────────────────────────────────────────
// RiskBadge — small dot + GB/d value + mini progress bar showing the
// ratio of observed GB/d to configured threshold. Used inside the
// AdminTrafficUsage column defs to colour rows by risk level.
// ──────────────────────────────────────────────────────────────────

export interface RiskBadgeProps {
  level: RiskLevel;
  ratio: number;
  gbPerDay: number;
}

export function RiskBadge({ level, ratio, gbPerDay }: RiskBadgeProps) {
  const style = RISK_STYLES[level];
  const barWidth = Math.min(ratio * 100, 100);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <span className={`text-[11px] font-semibold tabular-nums ${style.text}`}>
          {formatGbPerDay(gbPerDay)}
        </span>
        <span className={`text-[10px] ${style.text} opacity-60`}>GB/d</span>
      </div>
      <div className={`h-1 w-full max-w-[60px] rounded-full ${style.bg}`}>
        <div
          className={`h-full rounded-full ${style.bar} transition-all`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
