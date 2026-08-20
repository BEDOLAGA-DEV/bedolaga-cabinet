import type { ReactNode } from 'react';
import { Skeleton, SkeletonGroup } from './Skeleton';

export type PageSkeletonVariant = 'user' | 'admin';

/**
 * Высота заглушки заголовка по канону CLAUDE.md:
 * H1 юзер-страниц — text-2xl/sm:text-3xl, H1 админки — text-xl без скачков.
 */
const TITLE_HEIGHT: Record<PageSkeletonVariant, string> = {
  user: 'h-8',
  admin: 'h-7',
};

/**
 * Слева от заголовка: у юзер-страниц иконка 24px, у админских — кнопка
 * «назад» и/или иконка-чип, оба 40×40 со скруглением xl.
 */
const LEADING_BOX: Record<PageSkeletonVariant, string> = {
  user: 'h-6 w-6 rounded-lg',
  admin: 'h-10 w-10 rounded-xl',
};

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  /** Сколько квадратных заглушек слева: кнопка «назад», иконка-чип. */
  leading?: number;
  titleWidth?: string;
  /** Вертикальный ритм страницы: обычно space-y-6, кое-где space-y-5. */
  className?: string;
  /** Тело страницы — оно у каждой своё, общей тут только рамка. */
  children?: ReactNode;
}

/**
 * Рамка страничного скелетона: заголовок и вертикальный ритм.
 *
 * Страницы кабинета устроены одинаково — вертикальный стек, затем шапка с
 * заголовком и опциональными квадратными элементами слева. Повторять эту
 * рамку в каждой странице незачем, а тело остаётся специфичным: скелетон
 * обязан совпадать с формой будущего контента, иначе он хуже спиннера —
 * обещает одно, а приезжает другое.
 */
export function PageSkeleton({
  variant = 'user',
  leading = 0,
  titleWidth = 'w-48',
  className = 'space-y-6',
  children,
}: PageSkeletonProps) {
  return (
    <SkeletonGroup className={className}>
      <div className="flex items-center gap-3">
        {Array.from({ length: leading }, (_, i) => (
          <Skeleton key={i} className={`shrink-0 ${LEADING_BOX[variant]}`} />
        ))}
        <Skeleton className={`${TITLE_HEIGHT[variant]} ${titleWidth}`} />
      </div>
      {children}
    </SkeletonGroup>
  );
}
