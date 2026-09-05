import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';
import { cidrFromAddress, isCidr24 } from './jobBodies';
import { useHosts } from './useTargets';

export interface ScanTargetsProps {
  cidr: string;
  onChange: (cidr: string) => void;
}

/** Цель скана: одна подсеть /24, подсказки берутся из адресов хостов панели. */
export function ScanTargets({ cidr, onChange }: ScanTargetsProps) {
  const { t } = useTranslation();
  const { data: hosts = [] } = useHosts(false);
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    return hosts.flatMap((host) => {
      const subnet = cidrFromAddress(host.address);
      if (!subnet || seen.has(subnet)) return [];
      seen.add(subnet);
      return [{ subnet, label: host.remark }];
    });
  }, [hosts]);
  const invalid = cidr.trim() !== '' && !isCidr24(cidr);

  return (
    <section aria-labelledby="reachability-targets" className="space-y-3">
      <SectionHeading
        id="reachability-targets"
        title={t('admin.reachability.sections.targets')}
        hint={t('admin.reachability.switch.scanHint')}
      />
      <div>
        <label htmlFor="reachability-cidr" className="text-sm font-medium text-dark-200">
          {t('admin.reachability.scan.cidr')}
        </label>
        <input
          id="reachability-cidr"
          type="text"
          value={cidr}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('admin.reachability.scan.cidrPlaceholder')}
          aria-invalid={invalid}
          className="input mt-1 w-full font-mono sm:w-72"
        />
        {invalid && (
          <p className="mt-1 text-xs text-warning-400">{t('admin.reachability.scan.invalid')}</p>
        )}
      </div>
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs text-dark-400">{t('admin.reachability.scan.fromHost')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suggestions.map((item) => {
              const on = cidr.trim() === item.subnet;
              return (
                <button
                  key={item.subnet}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(item.subnet)}
                  className={cn(
                    'flex min-h-[40px] items-center gap-2 rounded-xl border px-3 text-sm',
                    on
                      ? 'border-accent-500/40 bg-accent-500/10 text-dark-50'
                      : 'border-dark-700/60 bg-dark-900/30 text-dark-200 hover:border-dark-600',
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="font-mono text-xs text-dark-400">{item.subnet}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
