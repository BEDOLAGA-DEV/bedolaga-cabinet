import { useEffect } from 'react';
import { usePlatform } from '@/platform';
import { installDoneKey, isTouchOnly } from '@/utils/doneKey';

/**
 * Клавиша «Готово» на экранной клавиатуре для всех однострочных полей
 * (см. utils/doneKey). Включается только на устройствах без мыши: на десктопе
 * Enter в поле должен работать как раньше.
 */
export function useDoneKey(): void {
  const { hideKeyboard } = usePlatform();
  useEffect(() => {
    const matchMedia =
      typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined;
    if (!isTouchOnly(matchMedia)) return;
    return installDoneKey({ hideKeyboard });
  }, [hideKeyboard]);
}
