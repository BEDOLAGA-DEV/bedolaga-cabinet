import { useTranslation } from 'react-i18next';
import type { Probes } from '@/api/reachability';
import { CheckIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface ProbesRowProps {
  probes: Probes;
  onChange: (probes: Probes) => void;
  /** Пробы, которые нельзя выключить (ICMP при нодах) или включить (SNI при скане). */
  locked?: Array<keyof Probes>;
}

const NAMES: Array<keyof Probes> = ['icmp', 'tcp', 'sni'];

/**
 * Пробы как в оригинале: ICMP · TCP · TLS-SNI, чипы-переключатели с пояснением.
 * Нажатая проба — с галочкой и заметной заливкой, чтобы выбор читался с первого взгляда.
 */
export function ProbesRow({ probes, onChange, locked = [] }: ProbesRowProps) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('admin.reachability.probes.title')}
      className="flex flex-wrap gap-2"
    >
      {NAMES.map((name) => {
        const isLocked = locked.includes(name);
        const on = probes[name];
        return (
          <button
            key={name}
            type="button"
            aria-pressed={on}
            disabled={isLocked}
            onClick={() => onChange({ ...probes, [name]: !on })}
            className={cn(
              'min-h-[44px] rounded-xl border px-3 py-1.5 text-left transition-colors disabled:opacity-60',
              on
                ? 'border-accent-500/70 bg-accent-500/20 text-accent-300 ring-1 ring-accent-500/40'
                : 'border-dark-700/60 bg-dark-900/40 text-dark-400 hover:border-dark-600 hover:text-dark-200',
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium leading-tight">
              {on && (
                <span aria-hidden="true" className="inline-flex">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
              )}
              {t(`admin.reachability.probes.${name}`)}
            </span>
            <span
              className={cn(
                'block text-[11px] leading-tight',
                on ? 'text-accent-400/80' : 'text-dark-400',
              )}
            >
              {t(`admin.reachability.probes.${name}Desc`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
