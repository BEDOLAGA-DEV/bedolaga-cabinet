import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { type LaunchMode, MODE_KEYS } from './deepLink';

interface ModeSwitchProps {
  value: LaunchMode;
  onChange: (mode: LaunchMode) => void;
}

/** Что проверяем — вкладки как в оригинале bsbord.com: хосты панели, IP / домен, CIDR, подписка. */
export function ModeSwitch({ value, onChange }: ModeSwitchProps) {
  const { t } = useTranslation();
  return (
    <div
      role="tablist"
      aria-label={t('admin.reachability.switch.label')}
      className="grid grid-cols-4 gap-1 rounded-xl bg-dark-800/50 p-1"
    >
      {MODE_KEYS.map((mode) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={cn(
              'min-h-[44px] rounded-lg px-1 py-2 text-sm font-medium leading-tight transition-all sm:px-2',
              active
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'text-dark-400 hover:text-dark-200',
            )}
          >
            {t(`admin.reachability.switch.${mode}`)}
          </button>
        );
      })}
    </div>
  );
}
