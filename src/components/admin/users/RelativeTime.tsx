import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { relativeTimeParts } from '@/utils/relativeTime';

interface RelativeTimeProps {
  value: string | null | undefined;
  className?: string;
  /** Точка-индикатор слева: зелёная, если человек онлайн. */
  dot?: boolean;
}

/** «онлайн», «2 ч назад», «3 нед назад» — последняя активность человека. */
export function RelativeTime({ value, className, dot = true }: RelativeTimeProps) {
  const { t } = useTranslation();
  const { key, count, isOnline } = relativeTimeParts(value);
  const label = isOnline ? t('common.relative.online') : t(`common.relative.${key}`, { count });

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-sm',
        isOnline
          ? 'font-medium text-success-400'
          : key === 'never'
            ? 'text-dark-500'
            : 'text-dark-300',
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            isOnline
              ? 'bg-success-400 shadow-[0_0_6px_rgba(var(--color-success-400),0.6)]'
              : 'bg-dark-600',
          )}
        />
      )}
      {label}
    </span>
  );
}
