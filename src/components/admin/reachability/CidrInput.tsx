import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { HostTarget } from '@/api/reachability';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { Card } from '@/components/data-display';
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
        .filter((item): item is { host: HostTarget; cidr: string } => item.cidr !== null)
        .map((item) => ({ value: item.cidr, label: `${item.host.remark} · ${item.cidr}` })),
    [hosts],
  );
  const invalid = value.trim() !== '' && !isCidr24(value);

  return (
    <Card size="md">
      <h2 className="text-lg font-semibold text-dark-100">{t('admin.reachability.scan.cidr')}</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
          <label className="w-full sm:w-72">
            <span className="sr-only">{t('admin.reachability.scan.fromHost')}</span>
            <DropdownSelect
              value=""
              onChange={(next) => next && onChange(next)}
              options={[{ value: '', label: t('admin.reachability.scan.fromHost') }, ...options]}
            />
          </label>
        )}
      </div>
      {invalid && (
        <p className="mt-2 text-xs text-warning-400">{t('admin.reachability.scan.invalid')}</p>
      )}
    </Card>
  );
}
