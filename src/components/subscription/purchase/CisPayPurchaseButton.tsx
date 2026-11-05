import { formatCisPayCharge } from '@/utils/cispayRecurring';
import { Link } from 'react-router';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { subscriptionApi, type CisPayQuote } from '../../../api/subscription';
import { usePlatform } from '../../../platform';
import { openPaymentUrl } from '../../../utils/openPaymentUrl';
import { canUseCisPayPeriod, cisPayErrorKey } from '../../../utils/cispayRecurring';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  tariffId: number;
  subscriptionId?: number;
  periodDays?: number;
  deviceLimit?: number;
  disabled?: boolean;
};

export function CisPayPurchaseButton(props: Props) {
  const { t, i18n } = useTranslation();
  const { platform, openLink } = usePlatform();
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState<{ key: string; data: CisPayQuote } | null>(null);
  const [targetId, setTargetId] = useState<number | undefined>();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const checkout = useRef<{ quoteId: string; id: string } | null>(null);
  const key = JSON.stringify([
    props.tariffId,
    props.subscriptionId,
    props.periodDays,
    props.deviceLimit,
  ]);
  const quoteMutation = useMutation({
    mutationFn: () =>
      subscriptionApi.quoteCisPayRecurring({
        tariff_id: props.tariffId,
        subscription_id: props.subscriptionId,
        period_days: props.periodDays!,
        device_limit: props.deviceLimit,
      }),
    onSuccess: (data) => {
      setQuote({ key, data });
      setStatus(null);
    },
  });
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!quote || quote.key !== key) throw new Error('Selection changed');
      if (checkout.current?.quoteId !== quote.data.quote_id) {
        checkout.current = { quoteId: quote.data.quote_id, id: crypto.randomUUID() };
      }
      return subscriptionApi.purchaseCisPayRecurring(quote.data.quote_id, checkout.current.id);
    },
    onError: (error: unknown) => {
      const code = (error as { response?: { data?: { detail?: { code?: string } } } })?.response
        ?.data?.detail?.code;
      if (code === 'quote_expired' || code === 'quote_changed') {
        setQuote(null);
        checkout.current = null;
      }
    },
    onSuccess: (data) => {
      setStatus(data.status);
      setTargetId(data.subscription_id ?? undefined);
      setPaymentUrl(data.redirect_url ?? null);
      queryClient.invalidateQueries({ queryKey: ['cispay-recurring'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      if (data.redirect_url) openPaymentUrl(data.redirect_url, platform, openLink);
    },
  });
  const current = quote?.key === key ? quote.data : null;
  const busy = quoteMutation.isPending || purchaseMutation.isPending;
  const unresolved =
    status &&
    ['CREATION_UNKNOWN', 'CREATING', 'PENDING', 'ACTIVE', 'PAUSED', 'CANCEL_PENDING'].includes(
      status,
    );
  if (!canUseCisPayPeriod(props.periodDays, false)) return null;
  return (
    <div className="mt-3 min-w-0 space-y-2">
      {quoteMutation.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : current && !status ? (
        <div className="space-y-1 text-sm leading-relaxed text-dark-300" aria-live="polite">
          <p>
            {t('subscription.cispayRecurring.consent', {
              amount: formatCisPayCharge(current.amount_kopeks, i18n.language),
              days: current.period_days,
            })}
          </p>
          <p className="text-xs text-dark-400">{t('subscription.cispayRecurring.schedule')}</p>
        </div>
      ) : null}
      {status && (
        <p role="status" className="text-sm leading-relaxed text-dark-300">
          {t(`subscription.cispayRecurring.state.${status}`, {
            defaultValue: t('subscription.cispayRecurring.checking'),
          })}
        </p>
      )}
      <button
        type="button"
        className="btn-secondary w-full whitespace-normal"
        disabled={props.disabled || busy || !!unresolved}
        onClick={() => (current && !status ? purchaseMutation.mutate() : quoteMutation.mutate())}
      >
        {busy
          ? t('common.loading')
          : current && (!status || unresolved)
            ? t('subscription.cispayRecurring.confirm')
            : t('subscription.cispayRecurring.choose')}
      </button>
      {status === 'PENDING' && paymentUrl && (
        <button
          type="button"
          className="btn-primary w-full whitespace-normal"
          onClick={() => openPaymentUrl(paymentUrl, platform, openLink)}
        >
          {t('subscription.cispayRecurring.continue')}
        </button>
      )}
      {targetId && (
        <Link
          className="btn-ghost block text-center whitespace-normal"
          to={`/subscriptions/${targetId}`}
        >
          {t('subscription.cispayRecurring.manage')}
        </Link>
      )}
      {(quoteMutation.isError || purchaseMutation.isError) && (
        <p role="alert" className="text-sm text-error-400">
          {t(cisPayErrorKey(purchaseMutation.error ?? quoteMutation.error))}
        </p>
      )}
    </div>
  );
}
