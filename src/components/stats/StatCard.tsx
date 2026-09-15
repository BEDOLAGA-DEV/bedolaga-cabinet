import type { ReactNode } from 'react';

import { TREND_STYLES } from './constants';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

export interface StatCardDelta {
  /** Signed percent change vs the comparison period. */
  percent: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Soft tinted chip + matching value colour, in the spirit of the Remnawave stats.
 * Подложка чипа — только в широкой плитке (tile-wide:), в узкой иконка идёт
 * маленькой перед подписью без подложки. Классы — целиком строками: Tailwind
 * собирает их из исходника.
 */
const TONE = {
  neutral: { chip: 'text-dark-300 tile-wide:bg-dark-700/60', value: 'text-dark-100' },
  success: { chip: 'text-success-400 tile-wide:bg-success-500/15', value: 'text-success-400' },
  accent: { chip: 'text-accent-400 tile-wide:bg-accent-500/15', value: 'text-accent-400' },
  warning: { chip: 'text-warning-400 tile-wide:bg-warning-500/15', value: 'text-warning-400' },
  error: { chip: 'text-error-400 tile-wide:bg-error-500/15', value: 'text-error-400' },
} as const;

/** С какой длины значение считается длинным (≈ «1 234 567,89 ₽» и длиннее). */
const LONG_VALUE_CHARS = 11;

interface StatCardProps {
  /** Необязателен в режиме загрузки: тогда вместо подписи рисуется заглушка. */
  label?: string;
  value?: string | number;
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
  // Длинное значение («87 654 321,00 ₽») в узкой плитке не влезало и рвалось посреди
  // числа. Такому значению шрифт подстраивается под ширину плитки (единицы cqi
  // контейнера stat-tile), короткие числа остаются крупными.
  const longValue = value !== undefined && String(value).length > LONG_VALUE_CHARS;

  // Раскладка зависит от ширины самой плитки (вариант tile-wide), колонки одни:
  //   широкая — подпись сверху, ниже «чип-иконка · значение», как у Remnawave;
  //   узкая (две в ряд на телефоне, ~114 px) — маленькая иконка перед подписью,
  //   значение отдельной строкой во всю ширину. Рядом с чипом места не хватало ни
  //   сумме («100,0…», «12 34…» — цифры пропадали), ни подписи («Всего заработа…»).
  return (
    <div className="h-full rounded-xl bg-dark-800/30 p-3 transition-colors [container:stat-tile/inline-size] hover:bg-dark-800/50">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1.5 tile-wide:gap-x-2.5">
        <div
          className={cn(
            'row-start-1 flex min-w-0 items-center justify-between gap-2',
            icon ? 'col-start-2 tile-wide:col-span-2 tile-wide:col-start-1' : 'col-span-2',
          )}
        >
          {loading && !label ? (
            // Карточка сама себе скелетон: страницам не нужно угадывать её высоту.
            // Высота замерена по реальной подписи, а не выведена из шкалы:
            // на мобиле leading-tight перебивает text-xs и даёт 15px, а на sm
            // responsive-вариант text-sm перебивает leading-tight и даёт 20px.
            <Skeleton className="h-[15px] w-24 sm:h-5" />
          ) : (
            <span className="line-clamp-2 hyphens-auto text-xs leading-tight text-dark-500 sm:text-sm">
              {label}
            </span>
          )}
          {trailing}
        </div>
        {/* The forced svg size normalises every icon regardless of what the call
            site passes. */}
        {icon && (
          <span
            className={`col-start-1 row-start-1 flex h-4 w-4 shrink-0 items-center justify-center self-start rounded-lg tile-wide:row-start-2 tile-wide:h-9 tile-wide:w-9 tile-wide:self-center [&>svg]:h-4 [&>svg]:w-4 tile-wide:[&>svg]:h-5 tile-wide:[&>svg]:w-5 ${toneStyle.chip}`}
          >
            {icon}
          </span>
        )}
        <div
          className={cn(
            'col-span-2 row-start-2 min-w-0',
            icon && 'tile-wide:col-span-1 tile-wide:col-start-2',
          )}
        >
          {loading ? (
            <Skeleton className="h-7 w-20 rounded" />
          ) : (
            <>
              {/* Не обрезать: сумма с многоточием теряет цифры. Если не влезла
                  и во всю ширину — переносится. */}
              <div
                className={cn(
                  'font-semibold [overflow-wrap:anywhere] tile-wide:text-lg sm:tile-wide:text-xl',
                  longValue ? 'text-[length:clamp(0.75rem,10cqi,1rem)]' : 'text-base',
                  valueClass,
                )}
              >
                {value}
              </div>
              {subValue && (
                <div className="text-xs text-dark-500 [overflow-wrap:anywhere]">{subValue}</div>
              )}
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
