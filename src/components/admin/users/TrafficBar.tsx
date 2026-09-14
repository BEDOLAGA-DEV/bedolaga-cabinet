import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatGb, formatGbPair } from '@/utils/formatNumber';

interface TrafficBarProps {
  usedGb: number;
  limitGb: number;
  className?: string;
  /** Ширина полосы; по умолчанию растягивается на свободное место. */
  barClassName?: string;
  /** Подпись справа: «12,8 / 100 ГБ» или «безлимит». */
  label?: boolean;
}

export function trafficPercent(usedGb: number, limitGb: number): number {
  if (limitGb <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((usedGb / limitGb) * 100)));
}

/** Пороги окраски полосы: жёлтая от 75 %, красная от 95 %. */
export const TRAFFIC_WARN_PERCENT = 75;
export const TRAFFIC_CRITICAL_PERCENT = 95;

export function trafficFill(percent: number): string {
  if (percent >= TRAFFIC_CRITICAL_PERCENT) return 'bg-error-400';
  if (percent >= TRAFFIC_WARN_PERCENT) return 'bg-warning-400';
  return 'bg-accent-500';
}

/** «870 / 1 500 ГБ»; при безлимите — расход и слово «безлимит». */
export function useTrafficLabel() {
  const { t } = useTranslation();
  const unit = t('common.units.gb');
  return (usedGb: number, limitGb: number) =>
    limitGb > 0
      ? formatGbPair(usedGb, limitGb, unit)
      : `${formatGb(usedGb)} ${unit} · ${t('admin.users.unlimited')}`;
}

/** Минимальная видимая ширина заливки, когда расход есть, но меньше процента. */
const MIN_FILL_PERCENT = 2;

export function TrafficBar({
  usedGb,
  limitGb,
  className,
  barClassName,
  label = true,
}: TrafficBarProps) {
  const trafficLabel = useTrafficLabel();
  const percent = trafficPercent(usedGb, limitGb);
  const unlimited = limitGb <= 0;
  const fillWidth = usedGb > 0 ? Math.max(percent, MIN_FILL_PERCENT) : 0;

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={unlimited ? undefined : percent}
        className={cn(
          'h-1.5 overflow-hidden rounded-full bg-dark-700/60',
          barClassName ?? 'min-w-[48px] flex-1',
        )}
      >
        {!unlimited && (
          <div
            className={cn('h-full rounded-full', trafficFill(percent))}
            style={{ width: `${fillWidth}%` }}
          />
        )}
      </div>
      {label && (
        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-dark-400">
          {trafficLabel(usedGb, limitGb)}
        </span>
      )}
    </div>
  );
}
