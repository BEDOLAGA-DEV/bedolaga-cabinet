import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { type SkeletonVariant, skeletonClass } from './skeletonStyles';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  circle?: boolean;
  animate?: boolean;
  /** Сколько одинаковых плейсхолдеров отрисовать подряд. */
  count?: number;
  className?: string;
  /** Для случаев с рантайм-фоном — например, стеклянные карточки Subscriptions. */
  style?: CSSProperties;
}

/**
 * Плейсхолдер загрузки. Без классов размера повторяет высоту текста родителя.
 *
 * Рендерится как <span class="block">, а не <div>, чтобы его можно было
 * ставить внутрь <p> и прочих inline-контекстов без невалидной вложенности.
 */
export function Skeleton({
  variant = 'line',
  circle = false,
  animate = true,
  count = 1,
  className,
  style,
}: SkeletonProps) {
  const cls = skeletonClass({ variant, circle, animate, className });

  if (count === 1) {
    return <span className={cls} style={style} />;
  }

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cls} style={style} />
      ))}
    </>
  );
}

/**
 * Обёртка вокруг группы скелетонов: сообщает скринридеру, что здесь идёт
 * загрузка. role="status" несёт неявный aria-live="polite" — те же атрибуты,
 * что уже стоят на Spinner (src/components/ui/Spinner.tsx).
 *
 * Сами <Skeleton> намеренно ничего не объявляют: иначе на экране из двадцати
 * плейсхолдеров скринридер зачитал бы «загрузка» двадцать раз.
 */
export function SkeletonGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div role="status" aria-busy="true" aria-label={t('common.loading')} className={className}>
      {children}
    </div>
  );
}
