import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { HostTarget } from '@/api/reachability';
import { cidrFromAddress, isCidr24 } from './jobBodies';

interface CidrInputProps {
  value: string;
  onChange: (value: string) => void;
  hosts?: HostTarget[];
}

export function CidrInput({ value, onChange, hosts = [] }: CidrInputProps) {
  const { t } = useTranslation();
  const options = useMemo(
    () =>
      hosts
        .map((host) => ({ host, cidr: cidrFromAddress(host.address) }))
        .filter((item): item is { host: HostTarget; cidr: string } => item.cidr !== null),
    [hosts],
  );
  const invalid = value.trim() !== '' && !isCidr24(value);

  return (
    <section className="rounded-2xl border border-dark-700/60 bg-dark-800/60 p-4">
      <h2 className="text-lg font-semibold text-dark-100">{t('admin.reachability.scan.cidr')}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('admin.reachability.scan.cidrPlaceholder')}
          aria-label={t('admin.reachability.scan.cidr')}
          aria-invalid={invalid}
          className="input w-full font-mono sm:w-64"
        />
        {options.length > 0 && (
          <select
            value=""
            onChange={(event) => event.target.value && onChange(event.target.value)}
            aria-label={t('admin.reachability.scan.fromHost')}
            className="rounded-xl border border-dark-700 bg-dark-900 px-3 py-2 text-sm text-dark-100"
          >
            <option value="">{t('admin.reachability.scan.fromHost')}</option>
            {options.map((item) => (
              <option key={item.host.uuid} value={item.cidr}>
                {item.host.remark} · {item.cidr}
              </option>
            ))}
          </select>
        )}
      </div>
      {invalid && (
        <p className="mt-2 text-xs text-warning-400">{t('admin.reachability.scan.invalid')}</p>
      )}
    </section>
  );
}
