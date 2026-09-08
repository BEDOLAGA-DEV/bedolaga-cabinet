import { useCallback, useEffect, useState } from 'react';

/**
 * Обратный отсчёт в секундах для кнопок вроде «отправить письмо ещё раз».
 *
 * Считает по сроку окончания, а не по числу тиков: `setInterval` в фоновой
 * вкладке душат до одного срабатывания в минуту, и счётчик «на тиках» после
 * возвращения показывал бы недосчитанные секунды — кнопка оставалась бы
 * заблокированной куда дольше обещанного.
 */
export function useCountdown(): [seconds: number, start: (from: number) => void] {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  const start = useCallback((from: number) => {
    const safe = Number.isFinite(from) ? Math.max(0, Math.floor(from)) : 0;
    if (safe === 0) {
      setDeadline(null);
      setSeconds(0);
      return;
    }
    setSeconds(safe);
    setDeadline(Date.now() + safe * 1000);
  }, []);

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(left);
      if (left === 0) setDeadline(null);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadline]);

  return [seconds, start];
}
