import { useTranslation } from 'react-i18next';
import { MAX_SNI_HOSTS, parseSniHosts } from './sniNames';

interface SniHostsFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Имена, которые бот возьмёт сам, если поле пустое: SNI хоста или его домен. */
  autoNames: string[];
}

/**
 * Поле «SNI-хост» как в оригинале: имя вводится руками (дефолт из настроек подставлен),
 * до пяти имён через запятую — это Multi-SNI. Пустое поле — имена целей, у IP их нет.
 */
export function SniHostsField({ value, onChange, autoNames }: SniHostsFieldProps) {
  const { t } = useTranslation();
  const parsed = parseSniHosts(value);
  const effective = parsed.names.length > 0 ? parsed.names : autoNames;

  return (
    <div>
      <label htmlFor="reachability-sni-hosts" className="block text-sm font-medium text-dark-200">
        {t('admin.reachability.probes.sniHost')}
      </label>
      <input
        id="reachability-sni-hosts"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('admin.reachability.probes.sniHostPlaceholder')}
        aria-invalid={parsed.invalid.length > 0 || parsed.overLimit > 0}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="input mt-1.5 w-full font-mono text-sm sm:max-w-md"
      />
      <p className="mt-1.5 text-xs text-dark-400">
        {t('admin.reachability.probes.sniHostHint', { max: MAX_SNI_HOSTS })}
      </p>
      {parsed.invalid.length > 0 && (
        <p className="mt-1 text-xs text-warning-400">
          {t('admin.reachability.probes.sniInvalid', { names: parsed.invalid.join(', ') })}
        </p>
      )}
      {parsed.overLimit > 0 && (
        <p className="mt-1 text-xs text-warning-400">
          {t('admin.reachability.probes.sniOverLimit', {
            count: parsed.overLimit,
            max: MAX_SNI_HOSTS,
          })}
        </p>
      )}
      <p className="mt-1 text-xs text-dark-300">
        {effective.length > 0 ? (
          <>
            <span className="text-dark-400">
              {t('admin.reachability.probes.sniNames', { names: '' })}
            </span>
            <span className="font-mono">
              {effective.map((name, index) => `${index + 1} ${name}`).join(' · ')}
            </span>
            {parsed.names.length === 0 && (
              <span className="ml-1 text-dark-400">{t('admin.reachability.probes.sniAuto')}</span>
            )}
          </>
        ) : (
          <span className="text-warning-400">{t('admin.reachability.probes.sniMissing')}</span>
        )}
      </p>
    </div>
  );
}
