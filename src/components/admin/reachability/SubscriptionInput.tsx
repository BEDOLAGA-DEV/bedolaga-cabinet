import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ParsedInput, RejectedConfig } from '@/api/reachability';
import { getApiErrorMessage } from '@/utils/api-error';

interface SubscriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  parsed: UseQueryResult<ParsedInput>;
}

const REASON_KEYS = ['stub', 'unsupported_scheme', 'malformed', 'subscription_failed'];

function rejectedTitle(items: RejectedConfig[], t: (key: string) => string): string {
  return items
    .map((item) => {
      const reason = REASON_KEYS.includes(item.reason)
        ? t(`admin.reachability.subscription.rejectedReasons.${item.reason}`)
        : item.reason;
      return `${reason}: ${item.preview}`;
    })
    .join('\n');
}

/**
 * Поле «Конфиг или подписка» как в оригинале: ссылки vless/vmess/trojan/ss/hysteria2,
 * URL подписки или base64 построчно; бот разбирает и отдаёт список серверов.
 */
export function SubscriptionInput({ value, onChange, parsed }: SubscriptionInputProps) {
  const { t } = useTranslation();
  const data = parsed.data;
  return (
    <div>
      <label htmlFor="reachability-raw-input" className="block text-sm font-medium text-dark-200">
        {t('admin.reachability.subscription.input')}
      </label>
      <textarea
        id="reachability-raw-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={t('admin.reachability.subscription.inputPlaceholder')}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="input mt-1.5 w-full font-mono text-xs"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {parsed.isFetching && (
          <span role="status" className="text-dark-400">
            {t('admin.reachability.subscription.loading')}
          </span>
        )}
        {parsed.isError && (
          <span role="alert" className="text-error-400">
            {getApiErrorMessage(parsed.error, t('admin.reachability.subscription.parseFailed'))}
          </span>
        )}
        {data?.sources.map((source) => (
          <span
            key={`${source.kind}:${source.label}`}
            title={source.label}
            className="rounded-md bg-accent-500/10 px-1.5 py-0.5 text-accent-400"
          >
            {t(
              source.kind === 'links'
                ? 'admin.reachability.subscription.sourceLinks'
                : 'admin.reachability.subscription.sourceSubscription',
              { count: source.count },
            )}
          </span>
        ))}
        {data && data.rejected.length > 0 && (
          <span title={rejectedTitle(data.rejected, t)} className="text-warning-400">
            {t('admin.reachability.subscription.rejected', { count: data.rejected.length })}
          </span>
        )}
      </div>
      {data?.rejected
        .filter((item) => item.reason === 'subscription_failed')
        .map((item) => (
          <p key={item.preview} role="alert" className="mt-1.5 text-xs text-error-400">
            {t('admin.reachability.subscription.notLoaded')}:{' '}
            {item.detail ??
              t('admin.reachability.subscription.rejectedReasons.subscription_failed')}
          </p>
        ))}
      {data?.sources
        .filter((source) => source.note)
        .map((source) => (
          <p key={`${source.kind}:${source.label}`} className="mt-1.5 text-xs text-warning-400">
            {source.note}
          </p>
        ))}
    </div>
  );
}
