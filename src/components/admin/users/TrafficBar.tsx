import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatTraffic } from '@/utils/formatTraffic';

interface TrafficBarProps {
  usedGb: number;
  limitGb: number;
  className?: string;
  /** Подпись справа: «12,8 ГБ из 100 ГБ» или «безлимит». */
  label?: boolean;
}

/** «100 ГБ», а не «100.0 ГБ»: в узкой строке списка лишний ноль только шумит. */
const compact = (gb: number) => formatTraffic(gb).replace(/\.0(\s)/, '$1');

export function trafficPercent(usedGb: number, limitGb: number): number {
  if (limitGb <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((usedGb / limitGb) * 100)));
}

/** Полоса расхода: жёлтая от 75 %, красная от 95 % — те же пороги, что у чипов. */
export function TrafficBar({ usedGb, limitGb, className, label = true }: TrafficBarProps) {
  const { t } = useTranslation();
  const percent = trafficPercent(usedGb, limitGb);
  const unlimited = limitGb <= 0;
  const fill = percent >= 95 ? 'bg-error-400' : percent >= 75 ? 'bg-warning-400' : 'bg-accent-500';

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={unlimited ? undefined : percent}
        className="h-1.5 min-w-[48px] flex-1 overflow-hidden rounded-full bg-dark-800"
      >
        {!unlimited && (
          <div className={cn('h-full rounded-full', fill)} style={{ width: `${percent}%` }} />
        )}
      </div>
      {label && (
        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-dark-400">
          {unlimited ? t('admin.users.unlimited') : `${compact(usedGb)} / ${compact(limitGb)}`}
        </span>
      )}
    </div>
  );
}
