import { useTranslation } from 'react-i18next';
import type { JobKind } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { KIND_KEYS } from './deepLink';

interface KindSwitchProps {
  value: JobKind;
  onChange: (kind: JobKind) => void;
}

/** Что проверяем: хосты и адреса, подписка, подсеть. Сегмент с подсказкой под ним. */
export function KindSwitch({ value, onChange }: KindSwitchProps) {
  const { t } = useTranslation();
  return (
    <div>
      <div
        role="tablist"
        aria-label={t('admin.reachability.switch.label')}
        className="grid grid-cols-3 gap-1 rounded-xl bg-dark-800/50 p-1"
      >
        {KIND_KEYS.map((kind) => {
          const active = kind === value;
          return (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(kind)}
              className={cn(
                'min-h-[44px] rounded-lg px-2 py-2 text-sm font-medium leading-tight transition-all',
                active
                  ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                  : 'text-dark-400 hover:text-dark-200',
              )}
            >
              {t(`admin.reachability.switch.${kind}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
