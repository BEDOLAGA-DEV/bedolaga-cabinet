import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router';

import { PageSkeleton } from '@/components/ui/skeleton';
import { useLiteMode } from '@/hooks/useLiteMode';

const SubscriptionFull = lazy(() => import('./Subscription'));
const SubscriptionLite = lazy(() => import('./SubscriptionLite'));

/**
 * Развилка страницы подписки.
 *
 * Оба экрана ленивые: полная страница — самый большой файл кабинета, и тащить
 * её в чанк тому, кто её не увидит, незачем.
 *
 * `?full=1` — не отладочный флаг, а единственная дорога к тем настройкам,
 * которых в простом виде нет (автоплатёж, рекурренты, пауза, перевыпуск,
 * список устройств). Простой экран ссылается сюда строкой «Все настройки
 * подписки», поэтому ничего не оказывается недоступным.
 */
export default function SubscriptionScreen() {
  const { lite } = useLiteMode();
  const [searchParams] = useSearchParams();
  const forceFull = searchParams.get('full') === '1';

  return (
    <Suspense fallback={<PageSkeleton />}>
      {lite && !forceFull ? <SubscriptionLite /> : <SubscriptionFull />}
    </Suspense>
  );
}
