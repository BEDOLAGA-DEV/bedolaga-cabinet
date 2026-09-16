import { useEffect, useState } from 'react';

/**
 * Текущее время, которое само обновляется, — для отметок, протухающих на глазах.
 *
 * Зелёная точка «в сети» гаснет через минуту после последнего подключения. Без
 * тикающих часов страница, открытая пять минут назад, держала бы точку зажжённой
 * до следующего ответа сервера: список считался бы «показывает тех, кто был
 * онлайн минуту назад».
 *
 * В фоновой вкладке браузер душит таймеры — это и не нужно: при возвращении
 * первый же тик пересчитает время от текущего `Date.now()`, а не от числа тиков.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
