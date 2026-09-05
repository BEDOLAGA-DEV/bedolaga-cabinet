import { useTranslation } from 'react-i18next';
import type { Probes } from '@/api/reachability';
import { cn } from '@/lib/utils';

interface ProbesRowProps {
  probes: Probes;
  onChange: (probes: Probes) => void;
  /** Пробы, которые нельзя выключить (ICMP при нодах) или включить (SNI при скане). */
  locked?: Array<keyof Probes>;
}

const NAMES: Array<keyof Probes> = ['icmp', 'tcp', 'sni'];

/** Пробы как в оригинале: ICMP · TCP · TLS-SNI, чипы-переключатели с пояснением. */
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
                ? 'border-accent-500/40 bg-accent-500/10 text-accent-400'
                : 'border-dark-700/60 bg-dark-900/40 text-dark-300',
            )}
          >
            <span className="block text-sm font-medium leading-tight">
              {t(`admin.reachability.probes.${name}`)}
            </span>
            <span className="block text-[11px] leading-tight text-dark-400">
              {t(`admin.reachability.probes.${name}Desc`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
