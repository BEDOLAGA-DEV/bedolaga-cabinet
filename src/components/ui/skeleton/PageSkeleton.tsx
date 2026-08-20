import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { SkeletonGroup } from './Skeleton';

interface PageSkeletonProps {
  /** Ширина заглушки заголовка. */
  titleWidth?: string;
  /** Квадратная заглушка слева от заголовка: иконка страницы или кнопка «назад». */
  leading?: boolean;
  /** Вертикальный ритм страницы: у большинства space-y-6, кое-где space-y-5. */
  className?: string;
  /** Тело страницы — оно у каждой своё, общей тут только рамка. */
  children?: ReactNode;
}

/**
 * Рамка страничного скелетона: заголовок и вертикальный ритм.
 *
 * Все пользовательские страницы кабинета устроены одинаково — `space-y-6`,
 * затем H1 (`text-2xl sm:text-3xl`, отсюда высота заглушки h-8), иногда с
 * иконкой или кнопкой «назад» слева. Повторять эту рамку в каждой странице
 * незачем, а тело остаётся специфичным: скелетон обязан совпадать с формой
 * будущего контента, иначе он хуже спиннера — обещает одно, приезжает другое.
 */
export function PageSkeleton({
  titleWidth = 'w-48',
  leading = false,
  className = 'space-y-6',
  children,
}: PageSkeletonProps) {
  return (
    <SkeletonGroup className={className}>
      <div className="flex items-center gap-3">
        {leading && <Skeleton className="h-6 w-6 shrink-0 rounded-lg" />}
        <Skeleton className={`h-8 ${titleWidth}`} />
      </div>
      {children}
    </SkeletonGroup>
  );
}
