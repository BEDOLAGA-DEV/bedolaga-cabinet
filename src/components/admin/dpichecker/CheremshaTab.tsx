import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type CheremshaItem, dpicheckerApi } from '@/api/dpichecker';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';

const CHEREMSHA_MAX = 20;

type Verdict = 'blocked' | 'maybe' | 'noResolve' | 'notFound';

/** Вердикт — как на сайте: в реестре → «заблокирован»; подсеть/CDN из реестра → «возможно»; и т.д. */
export function cheremshaVerdict(item: CheremshaItem): Verdict {
  if (item.blocked) return 'blocked';
  if (item.rkn_subnet_hit || item.cdn_hit) return 'maybe';
  if (item.is_domain && item.resolved_ips.length === 0) return 'noResolve';
  return 'notFound';
}

const TONE: Record<Verdict, string> = {
  blocked: 'text-error-400',
  maybe: 'text-warning-400',
  noResolve: 'text-dark-300',
  notFound: 'text-success-400',
};

/** «Черемша»: есть ли домен или IP в реестре РКН и в CDN-списках. Бесплатно, до 20 за раз. */
export function CheremshaTab() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const check = useMutation({
    mutationFn: () =>
      dpicheckerApi.cheremsha(
        text
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, CHEREMSHA_MAX),
      ),
  });
  const data = check.data;
  return (
    <div className="space-y-4">
      <section className="bento-card space-y-3 p-4 sm:p-5">
        <p className="text-sm text-dark-300">{t('admin.dpichecker.cheremsha.intro')}</p>
        <textarea
          className="input min-h-[96px] w-full font-mono text-xs"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('admin.dpichecker.cheremsha.placeholder')}
          aria-label={t('admin.dpichecker.cheremsha.placeholder')}
        />
        <button
          type="button"
          className="btn-primary min-h-[44px] px-5 text-sm"
          disabled={!text.trim() || check.isPending}
          onClick={() => check.mutate()}
        >
          {t('admin.dpichecker.cheremsha.run')}
        </button>
        {check.isError && (
          <p className="text-sm text-error-400">
            {getApiErrorMessage(check.error, t('admin.dpichecker.form.failed'))}
          </p>
        )}
      </section>
      {data && (
        <section className="bento-card space-y-3 p-4 sm:p-5">
          {data.results.map((item) => {
            const verdict = cheremshaVerdict(item);
            return (
              <div
                key={item.resource}
                className="space-y-0.5 border-b border-dark-800/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-sm text-dark-100">{item.resource}</span>
                  <span className={cn('text-sm font-medium', TONE[verdict])}>
                    {t(`admin.dpichecker.cheremsha.verdict.${verdict}`)}
                  </span>
                </div>
                {item.domain_hit && (
                  <p className="text-xs text-dark-300">
                    {t('admin.dpichecker.cheremsha.domainHit')}
                  </p>
                )}
                {(item.rkn_subnet_hit || item.cdn_hit) && (
                  <p className="text-xs text-dark-300">
                    {t('admin.dpichecker.cheremsha.subnet', {
                      value: item.rkn_subnet_hit ?? item.cdn_hit,
                    })}
                  </p>
                )}
                {item.resolved_ips.length > 0 && (
                  <p className="text-xs text-dark-400">
                    {t('admin.dpichecker.cheremsha.resolved', {
                      value: item.resolved_ips.join(', '),
                    })}
                  </p>
                )}
                {(item.asn_org || item.country) && (
                  <p className="text-xs text-dark-400">
                    {[item.asn && `AS${item.asn}`, item.asn_org, item.country]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            );
          })}
          {data.invalid.length > 0 && (
            <p className="text-xs text-dark-400">
              {t('admin.dpichecker.cheremsha.invalid', { items: data.invalid.join(', ') })}
            </p>
          )}
          {data.last_refresh && (
            <p className="text-xs text-dark-500">
              {t('admin.dpichecker.cheremsha.refreshed', {
                value: new Date(data.last_refresh).toLocaleString('ru-RU', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }),
              })}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
