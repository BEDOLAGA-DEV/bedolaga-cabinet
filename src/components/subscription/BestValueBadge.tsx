import { useTranslation } from 'react-i18next';
import { StarIcon } from '@/components/icons';

/**
 * Отметка периода, выбранного оператором как самый выгодный.
 *
 * Цвет намеренно не accent и не success: accent уже означает «этот вариант
 * выбран», success — размер скидки. Третий смысл третьим цветом, иначе рядом со
 * скидкой «−25 %» отметка читается как её продолжение.
 */
export function BestValueBadge({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-urgent-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-urgent-400 ${className ?? ''}`}
    >
      <StarIcon filled className="h-3 w-3" />
      {t('subscription.bestValue')}
    </span>
  );
}

/** Цвет рамки выделенного периода — тот же токен, что и у отметки. */
export const BEST_VALUE_BORDER = 'rgb(var(--color-urgent-400))';

/**
 * Рамка отмеченного варианта — одна на все витрины: золотой контур снаружи,
 * а у выбранного ещё и кольцо выбора внутри. Выбор не затирает золото, иначе
 * подсказка пропадала ровно у того варианта, к которому вела. Плашку при этом
 * ставить первой строкой карточки. Продление рисует то же самое через
 * BEST_VALUE_BORDER — там стили карточки инлайновые.
 */
export function bestValueFrame(selected: boolean): string {
  return selected
    ? 'border-2 border-urgent-400 ring-2 ring-inset ring-accent-500'
    : 'border-2 border-urgent-400';
}
