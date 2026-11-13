import { formatCisPayCharge } from '@/utils/cispayRecurring';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '../../../api/subscription';
import { usePlatform } from '../../../platform';
import { openPaymentUrl } from '../../../utils/openPaymentUrl';
import {
  canCancelCisPay,
  cisPayPeriodOptions,
  isCisPayTransition,
  type CisPaySetupTariff,
} from '../../../utils/cispayRecurring';
import { CisPayPurchaseButton } from '../purchase/CisPayPurchaseButton';

export function CisPayRecurringPanel({
  subscriptionId,
  adminUserId,
  canManage = true,
  setupTariff,
}: {
  subscriptionId: number;
  adminUserId?: number;
  canManage?: boolean;
  /** Current tariff of the subscription; set only when the customer may connect CisPay. */
  setupTariff?: CisPaySetupTariff & { id: number };
}) {
  const { t, i18n } = useTranslation();
  const { platform, openLink } = usePlatform();
  const client = useQueryClient();
  // Setup stays on this page: the purchase page opens tariff switching for an
  // active subscription and hides its current tariff, so it can't renew it.
  // Devices are not sent: the backend keeps the paid subscription's own limit.
  const options = cisPayPeriodOptions(setupTariff);
  const custom = options.custom;
  const canSetup = !adminUserId && canManage && (options.periods.length > 0 || custom !== null);
  const [chosenDays, setChosenDays] = useState<number | undefined>();
  // Raw text while typing, so «30» can be entered although «3» is below the minimum.
  const [customText, setCustomText] = useState<string | null>(null);
  const isOffered = (days: number) =>
    options.periods.includes(days) || (custom !== null && days >= custom.min && days <= custom.max);
  const periodDays =
    chosenDays !== undefined && isOffered(chosenDays)
      ? chosenDays
      : (options.periods[0] ?? custom?.min);
  const invalidCustom =
    customText !== null &&
    (!/^\d+$/.test(customText) ||
      !custom ||
      Number(customText) < custom.min ||
      Number(customText) > custom.max);
  const query = useQuery({
    queryKey: ['cispay-recurring', subscriptionId, adminUserId],
    queryFn: () => subscriptionApi.getCisPayRecurring(subscriptionId, adminUserId),
    retry: false,
    refetchInterval: (q) =>
      q.state.data && isCisPayTransition(q.state.data.status) && q.state.dataUpdateCount < 30
        ? 10000
        : false,
  });
  const cancel = useMutation({
    mutationFn: () => subscriptionApi.cancelCisPayRecurring(subscriptionId, adminUserId),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['cispay-recurring', subscriptionId, adminUserId] }),
  });
  const info = query.data;
  if (query.isPending) return <Skeleton className="mt-3 h-24 w-full" />;
  if (query.isError)
    return (
      <div className="mt-3 space-y-2 text-sm text-dark-300">
        <p role="alert">{t('subscription.cispayRecurring.checking')}</p>
        <button type="button" className="btn-secondary" onClick={() => query.refetch()}>
          {t('subscription.cispayRecurring.refresh')}
        </button>
      </div>
    );
  if (!info || (info.status === 'none' && !canSetup)) return null;
  return (
    <section
      className="bento-card min-w-0 space-y-3 p-4"
      aria-label={t('subscription.cispayRecurring.title')}
    >
      <h3 className="font-medium text-dark-100">{t('subscription.cispayRecurring.title')}</h3>
      <p role="status" className="text-sm text-dark-300">
        {t(`subscription.cispayRecurring.state.${info.status}`, {
          defaultValue: t('subscription.cispayRecurring.checking'),
        })}
      </p>
      {info.amount_kopeks !== undefined && (
        <p className="text-sm text-dark-300">
          {t('subscription.cispayRecurring.terms', {
            amount: formatCisPayCharge(info.amount_kopeks, i18n.language),
            days: info.period_days,
          })}
        </p>
      )}
      {info.next_charge_at && (
        <p className="text-sm text-dark-400">
          {t('subscription.cispayRecurring.next', {
            date: new Date(info.next_charge_at).toLocaleString(),
          })}
        </p>
      )}
      {info.reason && (
        <p className="text-sm text-dark-400">
          {t(`subscription.cispayRecurring.reason.${info.reason}`, {
            defaultValue: t('subscription.cispayRecurring.checking'),
          })}
        </p>
      )}
      {setupTariff && canSetup && !canCancelCisPay(info.status) && (
        <fieldset className="min-w-0 space-y-2">
          <legend className="text-sm text-dark-300">
            {t('subscription.cispayRecurring.period')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.periods.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={periodDays === days}
                className={periodDays === days ? 'btn-primary' : 'btn-secondary'}
                onClick={() => {
                  setChosenDays(days);
                  setCustomText(null);
                }}
              >
                {t('subscription.days', { count: days })}
              </button>
            ))}
            {custom && (
              <label className="flex w-full min-w-0 items-center justify-between gap-3 text-sm text-dark-300">
                <span className="min-w-0 break-words">
                  {t('subscription.customDays.title')}
                  <span className="block whitespace-nowrap tabular-nums text-dark-400">
                    {custom.min}–{custom.max}
                  </span>
                </span>
                <input
                  type="number"
                  value={customText ?? periodDays ?? custom.min}
                  inputMode="numeric"
                  step={1}
                  aria-invalid={invalidCustom}
                  min={custom.min}
                  max={custom.max}
                  aria-label={t('subscription.customDays.title')}
                  onChange={(e) => {
                    setCustomText(e.target.value);
                    const days = Number(e.target.value);
                    if (
                      /^\d+$/.test(e.target.value) &&
                      Number.isInteger(days) &&
                      days >= custom.min &&
                      days <= custom.max
                    )
                      setChosenDays(days);
                  }}
                  onBlur={() => setCustomText(null)}
                  className="w-20 shrink-0 rounded-lg border border-dark-600 bg-dark-900/50 px-3 py-2 text-center tabular-nums text-dark-100 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </label>
            )}
          </div>
          <CisPayPurchaseButton
            tariffId={setupTariff.id}
            subscriptionId={subscriptionId}
            periodDays={periodDays}
            disabled={invalidCustom}
          />
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        {!adminUserId && info.status === 'PENDING' && info.redirect_url && (
          <button
            type="button"
            className="btn-primary whitespace-normal"
            onClick={() => openPaymentUrl(info.redirect_url!, platform, openLink)}
          >
            {t('subscription.cispayRecurring.continue')}
          </button>
        )}
        {canManage && canCancelCisPay(info.status) && (
          <button
            type="button"
            className="btn-secondary whitespace-normal"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {cancel.isPending ? t('common.loading') : t('subscription.cispayRecurring.cancel')}
          </button>
        )}
        <button
          type="button"
          className="btn-ghost"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          {t('subscription.cispayRecurring.refresh')}
        </button>
      </div>
      {cancel.isError && (
        <p role="alert" className="text-sm text-error-400">
          {t('subscription.cispayRecurring.cancelError')}
        </p>
      )}
    </section>
  );
}
