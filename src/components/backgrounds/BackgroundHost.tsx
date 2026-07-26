import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { BackgroundRenderer } from './BackgroundRenderer';

/**
 * Держит анимированный фон смонтированным ПОВЕРХ смены роутов.
 *
 * Каждый роут оборачивается в собственный <Layout>, поэтому AppShell
 * перемонтируется при каждой навигации — если рендерить BackgroundRenderer
 * прямо из AppShell, анимация фона стартует заново на каждой странице.
 *
 * Вместо этого AppShell лишь регистрирует своё присутствие через
 * useBackgroundConsumer(), а BackgroundHost живёт в App (над <Routes>, не
 * перемонтируется) и держит один экземпляр BackgroundRenderer, пока есть хоть
 * один потребитель. Страницы без AppShell (логин, QuickPurchase со своим
 * экземпляром) фон, как и раньше, не получают.
 */
const useBackgroundConsumers = create<{ count: number }>(() => ({ count: 0 }));

/** Вызывается из AppShell: «на этом роуте должен быть анимированный фон». */
export function useBackgroundConsumer() {
  useEffect(() => {
    useBackgroundConsumers.setState((s) => ({ count: s.count + 1 }));
    return () => useBackgroundConsumers.setState((s) => ({ count: s.count - 1 }));
  }, []);
}

export function BackgroundHost() {
  const active = useBackgroundConsumers((s) => s.count > 0);
  const [mounted, setMounted] = useState(active);

  useEffect(() => {
    if (active) {
      setMounted(true);
      return;
    }
    // Грейс-период на случай, когда между размонтированием старого AppShell и
    // маунтом нового есть зазор (StrictMode, Suspense): без него фон моргал бы
    // и на таких переходах.
    const timer = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(timer);
  }, [active]);

  return mounted ? <BackgroundRenderer /> : null;
}
