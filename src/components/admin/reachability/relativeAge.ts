const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const JUST_NOW_MS = 45_000;

const JUST_NOW: Record<string, string> = {
  ru: 'только что',
  en: 'just now',
  zh: '刚刚',
  fa: 'همین حالا',
};

/** «5 мин. назад» через Intl: локаль — язык интерфейса, «сейчас» можно подменить в тестах. */
export function relativeAge(iso: string | null, language: string, nowMs = Date.now()): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = nowMs - then;
  if (diff < JUST_NOW_MS) return JUST_NOW[language.slice(0, 2)] ?? JUST_NOW.en;
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'always', style: 'short' });
  if (diff < HOUR) return format.format(-Math.round(diff / MINUTE), 'minute');
  if (diff < DAY) return format.format(-Math.round(diff / HOUR), 'hour');
  return format.format(-Math.round(diff / DAY), 'day');
}
