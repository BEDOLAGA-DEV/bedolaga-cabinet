import { uiLocale } from './uiLocale';

/**
 * Дата словами: «15 октября», «15 октября 2027 г.» — если год не текущий.
 *
 * Простой экран говорит о подписке фразой, и «работает до 15.10.2026» читается
 * как строка из выписки, а не как ответ человеку. Год в подавляющем
 * большинстве случаев лишний: подписки живут месяцами, и человек и так знает,
 * какой сейчас год. Но у длинных подписок год — единственное, что отличает
 * «15 октября» от «15 октября» через год, поэтому его добавляем, когда он
 * действительно несёт смысл.
 */
export function formatLiteDate(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(uiLocale(), {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
