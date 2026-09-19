import { useTranslation } from 'react-i18next';
import { SectionHeading } from './SectionHeading';
import { parseTargets } from './targetsInput';

export interface AddressTargetsProps {
  value: string;
  onChange: (text: string) => void;
}

/** Вкладка «IP / домен»: свои адреса списком, до 10 целей через запятую или с новой строки. */
export function AddressTargets({ value, onChange }: AddressTargetsProps) {
  const { t } = useTranslation();
  const parsed = parseTargets(value);
  return (
    <section aria-labelledby="reachability-targets" className="space-y-3">
      <SectionHeading
        id="reachability-targets"
        title={t('admin.reachability.sections.targets')}
        hint={t('admin.reachability.switch.ipHint')}
        aside={t('admin.reachability.targets.count', { count: parsed.targets.length })}
      />
      <div>
        <label htmlFor="reachability-addresses" className="block text-sm font-medium text-dark-200">
          {t('admin.reachability.addresses.label')}
        </label>
        <textarea
          id="reachability-addresses"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          placeholder={t('admin.reachability.addresses.placeholder')}
          className="input mt-1.5 w-full font-mono text-sm"
        />
        <p className="mt-1.5 text-xs text-dark-400">{t('admin.reachability.addresses.hint')}</p>
        {parsed.overLimit > 0 && (
          <p className="mt-1 text-xs text-warning-400">
            {t('admin.reachability.addresses.overLimit', { count: parsed.overLimit })}
          </p>
        )}
      </div>
    </section>
  );
}
