import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTrafficZone } from '../../hooks/useTrafficZone';
import { formatTraffic } from '../../utils/formatTraffic';
import { useTheme } from '../../hooks/useTheme';
import { getGlassColors } from '../../utils/glassTheme';

interface TrafficProgressBarProps {
  usedGb: number;
  limitGb: number;
  percent: number;
  isUnlimited: boolean;
  compact?: boolean;
}

const THRESHOLDS = [50, 75, 90];

export default function TrafficProgressBar({
  usedGb: _usedGb,
  limitGb,
  percent,
  isUnlimited,
  compact = false,
}: TrafficProgressBarProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const zone = useTrafficZone(percent);

  // Gradient always starts from the accent color (normal zone)
  const startColor = 'rgb(var(--color-accent-400))';
  const clampedPercent = Math.min(percent, 100);
  const barHeight = compact ? 8 : 14;

  // Multi-segment gradient matching prototype
  // Warning/danger hex colors are intentional — they represent fixed threshold tints,
  // not theme-dynamic values, and must remain distinct from the zone-based mainVar.
  const fillGradient = useMemo(() => {
    if (percent < 50) return `linear-gradient(90deg, ${startColor}, ${zone.mainVar})`;
    if (percent < 75)
      return `linear-gradient(90deg, ${startColor}, rgb(var(--color-warning-400)), ${zone.mainVar})`;
    if (percent < 90)
      return `linear-gradient(90deg, ${startColor}, rgb(var(--color-warning-400)), rgb(var(--color-warning-300)), ${zone.mainVar})`;
    return `linear-gradient(90deg, ${startColor}, rgb(var(--color-warning-400)), rgb(var(--color-warning-300)), rgb(var(--color-error-400)))`;
  }, [percent, zone.mainVar, startColor]);

  if (isUnlimited) {
    return (
      <div role="progressbar" aria-label={t('dashboard.unlimited')}>
        {/* Unlimited flowing bar */}
        <div
          className="relative overflow-hidden"
          style={{
            height: barHeight,
            borderRadius: 10,
            background: g.trackBg,
            border: `1px solid rgba(${zone.mainVarRaw}, 0.12)`,
          }}
        >
          <div
            className="absolute inset-0 animate-unlimited-flow"
            style={{
              background: `linear-gradient(90deg, rgba(${zone.mainVarRaw}, 0.31), ${zone.mainVar}, rgba(${zone.mainVarRaw}, 0.31))`,
              backgroundSize: '200% 100%',
            }}
          />
          <div
            className="absolute inset-0 animate-traffic-shimmer"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
            }}
            aria-hidden="true"
          />
          {/* Top highlight */}
          <div
            className="absolute left-0 right-0 top-0"
            style={{
              height: '50%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
              borderRadius: '10px 10px 0 0',
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${t('subscription.traffic')}: ${clampedPercent.toFixed(1)}%`}
    >
      {/* Track */}
      <div
        className="relative overflow-hidden"
        style={{
          height: barHeight,
          borderRadius: 10,
          background: g.trackBg,
          border: `1px solid ${g.trackBorder}`,
        }}
      >
        {/* Warning zone tint backgrounds */}
        <div className="absolute inset-0 flex" aria-hidden="true">
          <div style={{ flex: '50 0 0', background: 'transparent' }} />
          <div style={{ flex: '25 0 0', background: 'rgba(var(--color-warning-400), 0.03)' }} />
          <div style={{ flex: '15 0 0', background: 'rgba(var(--color-warning-300), 0.04)' }} />
          <div style={{ flex: '10 0 0', background: 'rgba(var(--color-error-400), 0.05)' }} />
        </div>

        {/* Fill bar */}
        <div
          className="absolute bottom-0 left-0 top-0 overflow-hidden"
          style={{
            width: `${clampedPercent}%`,
            borderRadius: 10,
            transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Gradient fill */}
          <div
            className="absolute inset-0"
            style={{
              background: fillGradient,
              transition: 'background 0.8s ease',
            }}
          />
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 animate-traffic-shimmer"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            }}
            aria-hidden="true"
          />
          {/* Top highlight */}
          <div
            className="absolute left-0 right-0 top-0"
            style={{
              height: '50%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
              borderRadius: '10px 10px 0 0',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Threshold markers */}
        {THRESHOLDS.map((threshold) => (
          <div
            key={threshold}
            className="absolute bottom-0 top-0"
            style={{
              left: `${threshold}%`,
              width: 1,
              background: g.textGhost,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Glow at fill edge */}
        {clampedPercent > 2 && (
          <div
            className="pointer-events-none absolute"
            style={{
              top: -4,
              bottom: -4,
              left: `calc(${clampedPercent}% - 8px)`,
              width: 16,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${zone.mainVarRaw}, 0.38), transparent)`,
              filter: 'blur(4px)',
              transition: 'left 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Scale labels */}
      {!compact && limitGb > 0 && (
        <div
          className="mt-1.5 flex justify-between px-0.5 font-mono text-[9px] font-medium text-dark-50/20"
          aria-hidden="true"
        >
          {[0, 25, 50, 75, 100].map((v) => (
            <span key={v}>{formatTraffic((limitGb * v) / 100)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
