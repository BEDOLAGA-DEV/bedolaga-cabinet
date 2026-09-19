import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InfoRowProps {
  label: ReactNode;
  value: ReactNode;
  /** Черта под строкой — для списков вида «Telegram ID / Имя / Дата». */
  divider?: boolean;
  className?: string;
}

/**
 * Строка «подпись слева — значение справа».
 *
 * Значения приходят от людей и из панели: почта на 45 знаков, ник на 32, имя из
 * двух длинных частей. Без зазора и без `min-w-0` такое значение прилипало к
 * подписи («Emailc…») и уводило строку за край карточки вместе с плашками. Здесь
 * подпись держит свою ширину, а значение переносится внутри остатка строки.
 *
 * Перенос — `overflow-wrap: anywhere`, а не `break-words`: только он уменьшает
 * минимальную ширину слова, и почта без пробелов рядом с плашкой «Подтверждён»
 * сжимается внутри гибкой строки, а не распирает её.
 */
export function InfoRow({ label, value, divider = false, className }: InfoRowProps) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-3',
        divider && 'border-b border-dark-800/50',
        className,
      )}
    >
      <span className="shrink-0 text-dark-400">{label}</span>
      <div
        data-info-value
        className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-1 text-right [overflow-wrap:anywhere] font-medium text-dark-100"
      >
        {value}
      </div>
    </div>
  );
}
