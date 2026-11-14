import { formatPayHotCharge } from '@/utils/payhotRecurring';
import { Link } from 'react-router';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { subscriptionApi, type PayHotQuote } from '../../../api/subscription';
import { usePlatform } from '../../../platform';
import { openPaymentUrl } from '../../../utils/openPaymentUrl';
import { isPayHotPeriod, payHotErrorKey } from '../../../utils/payhotRecurring';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  tariffId: number | null;
  methods: ('card' | 'sbp')[];
  subscriptionId?: number;
  periodDays?: number;
  deviceLimit?: number;
  disabled?: boolean;
};

export function PayHotPurchaseButton(props: Props) {
  const { t, i18n } = useTranslation();
  const { platform, openLink } = usePlatform();
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState<{ key: string; data: PayHotQuote } | null>(null);
  const [targetId, setTargetId] = useState<number | undefined>();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const checkout = useRef<{ quoteId: string; id: string } | null>(null);
  const [chosenMethod, setChosenMethod] = useState<'card' | 'sbp'>();
  const method =
    chosenMethod && props.methods.includes(chosenMethod) ? chosenMethod : props.methods[0];
  const key = JSON.stringify([
    method,
    props.tariffId,
    props.subscriptionId,
    props.periodDays,
    props.deviceLimit,
  ]);
  const quoteMutation = useMutation({
    mutationFn: async () => {
      if (!isPayHotPeriod(props.periodDays) || !method) throw new Error('Invalid selection');
      const requestKey = key;
      const data = await subscriptionApi.quotePayHotRecurring({
        tariff_id: props.tariffId,
        payment_method: method,
        subscription_id: props.subscriptionId,
        period_days: props.periodDays,
        device_limit: props.deviceLimit,
      });
      return { key: requestKey, data };
    },
    onSuccess: (result) => {
      setQuote(result);
      setStatus(null);
      checkout.current = null;
    },
  });
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!quote || quote.key !== key) throw new Error('Selection changed');
      if (checkout.current?.quoteId !== quote.data.quote_id) {
        checkout.current = { quoteId: quote.data.quote_id, id: crypto.randomUUID() };
      }
      return subscriptionApi.purchasePayHotRecurring(quote.data.quote_id, checkout.current.id);
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
      queryClient.invalidateQueries({ queryKey: ['payhot-recurring'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      if (data.redirect_url) openPaymentUrl(data.redirect_url, platform, openLink);
    },
  });
  const refreshMutation = useMutation({
    mutationFn: () => {
      if (targetId) return subscriptionApi.getPayHotRecurring(targetId);
      if (!checkout.current) throw new Error('Checkout unavailable');
      return subscriptionApi.purchasePayHotRecurring(checkout.current.quoteId, checkout.current.id);
    },
    onSuccess: (data) => {
      setStatus(data.status);
      setTargetId(data.subscription_id ?? targetId);
      setPaymentUrl(data.redirect_url ?? null);
      queryClient.invalidateQueries({ queryKey: ['payhot-recurring'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
    },
  });
  const current = quote?.key === key ? quote.data : null;
  const busy = quoteMutation.isPending || purchaseMutation.isPending || refreshMutation.isPending;
  const selectionChangedAfterAttempt = !!checkout.current && quote?.key !== key;
  const unresolved = status && !['none', 'CANCELLED', 'FAILED'].includes(status);
  if (!isPayHotPeriod(props.periodDays) || !method) return null;
  return (
    <div className="mt-3 min-w-0 space-y-2">
      <fieldset
        disabled={busy || !!unresolved || !!checkout.current}
        className="flex flex-wrap gap-2"
      >
        <legend className="mb-2 text-sm text-dark-400">
          {t('subscription.payhotRecurring.method')}
        </legend>
        {props.methods.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={method === item}
            className={method === item ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setChosenMethod(item)}
          >
            {t(`subscription.payhotRecurring.methods.${item}`)}
          </button>
        ))}
      </fieldset>
      {quoteMutation.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : current && !status ? (
        <div className="space-y-1 text-sm leading-relaxed text-dark-300" aria-live="polite">
          <p>
            {t('subscription.payhotRecurring.consent', {
              amount: formatPayHotCharge(current.amount_kopeks, i18n.language),
              days: current.period_days,
              method: t(`subscription.payhotRecurring.methods.${current.payment_method}`),
            })}
          </p>
          <p className="text-xs text-dark-400">{t('subscription.payhotRecurring.schedule')}</p>
        </div>
      ) : null}
      {status && (
        <p role="status" className="text-sm leading-relaxed text-dark-300">
          {t(`subscription.payhotRecurring.state.${status}`, {
            defaultValue: t('subscription.payhotRecurring.checking'),
          })}
        </p>
      )}
      <button
        type="button"
        className="btn-secondary w-full whitespace-normal"
        disabled={props.disabled || busy || !!unresolved || selectionChangedAfterAttempt}
        onClick={() => (current && !status ? purchaseMutation.mutate() : quoteMutation.mutate())}
      >
        {busy
          ? t('common.loading')
          : current && (!status || unresolved)
            ? t('subscription.payhotRecurring.confirm')
            : t('subscription.payhotRecurring.choose')}
      </button>
      {status === 'PENDING' && paymentUrl && (
        <button
          type="button"
          className="btn-primary w-full whitespace-normal"
          onClick={() => openPaymentUrl(paymentUrl, platform, openLink)}
        >
          {t('subscription.payhotRecurring.continue')}
        </button>
      )}
      {unresolved && status !== 'ACTIVE' && (
        <button
          type="button"
          className="btn-secondary w-full"
          disabled={busy}
          onClick={() => refreshMutation.mutate()}
        >
          {t('subscription.payhotRecurring.refresh')}
        </button>
      )}
      {targetId && (
        <Link
          className="btn-ghost block text-center whitespace-normal"
          to={`/subscriptions/${targetId}`}
        >
          {t('subscription.payhotRecurring.manage')}
        </Link>
      )}
      {(quoteMutation.isError || purchaseMutation.isError || refreshMutation.isError) && (
        <p role="alert" className="text-sm text-error-400">
          {t(
            payHotErrorKey(refreshMutation.error ?? purchaseMutation.error ?? quoteMutation.error),
          )}
        </p>
      )}
    </div>
  );
}
