import { useTranslation } from 'react-i18next';
import type { Probes } from '@/api/reachability';

interface ProbesPickerProps {
  probes: Probes;
  onChange: (probes: Probes) => void;
  /** Проба, которую нельзя выключить (ICMP при нодах). */
  locked?: Array<keyof Probes>;
}

const NAMES: Array<keyof Probes> = ['icmp', 'tcp', 'sni'];

export function ProbesPicker({ probes, onChange, locked = [] }: ProbesPickerProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="flex flex-wrap items-center gap-3 text-sm text-dark-200">
      <legend className="sr-only">{t('admin.reachability.probes.title')}</legend>
      <span className="text-xs uppercase tracking-wide text-dark-400">
        {t('admin.reachability.probes.title')}
      </span>
      {NAMES.map((name) => (
        <label key={name} className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-dark-600 accent-accent-500"
            checked={probes[name] || locked.includes(name)}
            disabled={locked.includes(name)}
            onChange={(event) => onChange({ ...probes, [name]: event.target.checked })}
          />
          {t(`admin.reachability.probes.${name}`)}
        </label>
      ))}
    </fieldset>
  );
}
