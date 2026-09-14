import { useEffect, useRef } from 'react';

interface Options {
  /** Пока `false`, наблюдатель не создаётся: конец ленты или уже идёт загрузка. */
  enabled: boolean;
  /** За сколько до конца начинать подгрузку. Два экрана — человек не видит паузы. */
  rootMargin?: string;
}

/**
 * Лента вместо страниц: возвращает ref для «сторожевого» элемента в конце списка,
 * при его появлении в зоне видимости зовёт `onReach`.
 *
 * Колбэк держится в ref, чтобы не пересоздавать наблюдатель на каждый рендер
 * страницы: пересоздание в момент подгрузки давало бы двойной запрос.
 */
export function useInfiniteScroll(
  onReach: () => void,
  { enabled, rootMargin = '800px 0px' }: Options,
) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onReach);
  callback.current = onReach;

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current();
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return ref;
}
