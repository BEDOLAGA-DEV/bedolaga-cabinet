import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { uiLocale } from '@/utils/uiLocale';
import { type RelativeTimeParts, calendarDay, relativeTimeParts } from '@/utils/relativeTime';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** «только что», «2 ч назад», «вчера», «3 нед назад», «не было». */
export function relativeLabel(parts: RelativeTimeParts, t: Translate): string {
  if (parts.key === 'now' || parts.key === 'never' || parts.key === 'yesterday') {
    return t(`common.relative.${parts.key}`);
  }
  return t(`common.relative.${parts.key}`, { count: parts.count });
}

/**
 * «сегодня, 15:10», «вчера, 09:02», «07.08.2026» — для «Вход в кабинет» и похожих
 * фактов, где важен и день, и время. Старые даты — без времени: оно уже ничего не говорит.
 */
export function dayTimeLabel(value: string | null | undefined, t: Translate): string {
  const day = calendarDay(value);
  if (!value || !day) return '—';
  const date = new Date(value);
  const locale = uiLocale();
  if (day === 'other') {
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return t(`common.dayTime.${day}`, { time });
}

/** «14.09» и «12:14» для колонки времени в лентах; год — только если не текущий. */
export function stampParts(value: string): { day: string; time: string } {
  const date = new Date(value);
  const locale = uiLocale();
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return {
    day: date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      ...(sameYear ? {} : { year: '2-digit' }),
    }),
    time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
  };
}

interface RelativeTimeProps {
  value: string | null | undefined;
  className?: string;
}

/**
 * «2 ч назад», «вчера» — когда человек последний раз что-то делал в боте или кабинете.
 * Не «онлайн»: подключение к VPN знает только панель, его показывает точка на аватаре.
 */
export function RelativeTime({ value, className }: RelativeTimeProps) {
  const { t } = useTranslation();
  const parts = relativeTimeParts(value);

  return (
    <span
      className={cn(
        'whitespace-nowrap text-sm',
        parts.key === 'never' ? 'text-dark-500' : 'text-dark-300',
        className,
      )}
      title={value ? new Date(value).toLocaleString(uiLocale()) : undefined}
    >
      {relativeLabel(parts, t)}
    </span>
  );
}
