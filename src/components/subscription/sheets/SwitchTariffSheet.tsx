import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '../../../store/auth';
import { safeSession } from '@/utils/safeStorage';
import {
  readTariffSwitchAttempt,
  tariffSwitchStorageKey,
  type TariffSwitchAttempt,
} from '@/utils/tariffSwitchAttempt';
import { subscriptionApi } from '../../../api/subscription';
import { getErrorMessage } from '../../../utils/subscriptionHelpers';
import { useCurrency } from '../../../hooks/useCurrency';
import { usePromoDiscount } from '../../../hooks/usePromoDiscount';
import { dailyPriceQuote } from '../purchase/dailyPrice';
import { buttonVariants } from '@/components/primitives/Button/Button.variants';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { formatLiteDate } from '@/utils/liteDate';
import { formatDateOrRaw } from '@/utils/format';
import { uiLocale } from '@/utils/uiLocale';
import { tariffTrafficLabel } from '@/utils/tariffTrafficLabel';
import InsufficientBalancePrompt from '../../InsufficientBalancePrompt';
import type { Subscription, Tariff } from '../../../types';
import { Skeleton, SkeletonGroup } from '../../ui/skeleton';

// ──────────────────────────────────────────────────────────────────
// SwitchTariffSheet
//
// Inline preview + confirm of a tariff switch on an existing
// subscription. Self-owns:
//   - the previewTariffSwitch query
//   - the switchTariff mutation
//   - the auto-scroll-into-view effect
//
// The parent keeps the `switchTariffId` selection state because the
// trigger lives on a tariff card inside TariffPickerGrid. When the
// backend reports `subscription_expired` (the user's subscription
// lapsed while the modal was open), the sheet hands off to the
// parent via `onExpiredFallback(tariff)`, which opens the regular
// TariffPurchaseForm instead of attempting another switch.
// ──────────────────────────────────────────────────────────────────

// The backend rejects a switch that must instead go through the purchase flow:
// the subscription lapsed (`subscription_expired`), it is a trial that has no
// paid value to prorate and would otherwise be handed a full target period
// (`trial_cannot_switch`, bug #629889), or it sits on a free 0₽ tariff whose
// spammed/gifted remainder must reset rather than be prorated and carried
// (`free_tariff_cannot_switch`, TARIFF_SWITCH_RESET_FREE_DAYS). All arrive as
// detail.code + use_purchase_flow=true; some payloads use the legacy
// `error_code` key, so we accept either.
function shouldUsePurchaseFlow(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false;
  const detail = error.response?.data?.detail as
    | { code?: string; error_code?: string; use_purchase_flow?: boolean }
    | undefined;
  if (!detail || typeof detail !== 'object') return false;
  const code = detail.code ?? detail.error_code;
  return (
    (code === 'subscription_expired' ||
      code === 'trial_cannot_switch' ||
      code === 'free_tariff_cannot_switch') &&
    detail.use_purchase_flow === true
  );
}

export interface SwitchTariffSheetProps {
  open: boolean;
  tariffId: number | null;
  subscriptionId: number | undefined;
  tariffs: Tariff[];
  subscription?: Subscription | null;
  onClose: () => void;
  onExpiredFallback: (tariff: Tariff) => void;
}

export function SwitchTariffSheet({
  open,
  tariffId,
  subscriptionId,
  tariffs,
  subscription,
  onClose,
  onExpiredFallback,
}: SwitchTariffSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const { applyPromoDiscount } = usePromoDiscount();
  const ref = useRef<HTMLHeadingElement>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const storageKey = tariffSwitchStorageKey(userId, subscriptionId);
  const [saved, setSaved] = useState<{ key: string | null; attempt: TariffSwitchAttempt | null }>(
    () => ({ key: storageKey, attempt: readTariffSwitchAttempt(storageKey) }),
  );
  const attempt = saved.key === storageKey ? saved.attempt : readTariffSwitchAttempt(storageKey);
  const activeAttempt = attempt?.preview.new_tariff_id === tariffId ? attempt : null;
  const [notice, setNotice] = useState('');

  const formatPrice = (kopeks: number) =>
    kopeks === 0
      ? t('subscription.free', 'Бесплатно')
      : `${formatAmount(kopeks / 100)}\u00A0${currencySymbol}`;

  const {
    data: freshPreview,
    isLoading: switchPreviewLoading,
    isFetching: switchPreviewFetching,
    isError: previewError,
    error: previewFailure,
    refetch,
  } = useQuery({
    queryKey: ['tariff-switch-preview', tariffId, subscriptionId, userId],
    queryFn: () => subscriptionApi.previewTariffSwitch(tariffId!, subscriptionId),
    enabled: open && !!tariffId && !activeAttempt,
    retry: false,
  });

  const switchPreview = activeAttempt?.preview ?? freshPreview;
  const splitLimits = switchPreview?.split_limits;
  const splitDailySwitch =
    switchPreview?.billing_kind === 'daily' ||
    (subscription?.traffic_accounting_mode === 'split' && subscription.is_daily);
  const invalidDailyQuote =
    !!switchPreview &&
    splitDailySwitch &&
    (switchPreview.traffic_accounting_mode !== 'split' ||
      switchPreview.billing_kind !== 'daily' ||
      !Number.isSafeInteger(switchPreview.source_daily_rate_kopeks) ||
      (switchPreview.source_daily_rate_kopeks ?? -1) < 0 ||
      !Number.isSafeInteger(switchPreview.target_daily_rate_kopeks) ||
      (switchPreview.target_daily_rate_kopeks ?? -1) < 0 ||
      !Number.isFinite(Date.parse(switchPreview.paid_window_end ?? '')));
  const invalidSplitQuote =
    invalidDailyQuote ||
    (switchPreview?.traffic_accounting_mode === 'split' &&
      (!/^[0-9a-f]{64}$/i.test(switchPreview.expected_terms_hash ?? '') ||
        !Number.isFinite(Date.parse(switchPreview.expected_end_date ?? '')) ||
        !Number.isSafeInteger(switchPreview.upgrade_cost_kopeks) ||
        switchPreview.upgrade_cost_kopeks < 0));
  const switchMutation = useMutation({
    mutationFn: async (id: number) => {
      setNotice('');
      if (!switchPreview || invalidSplitQuote)
        throw new Error(t('subscription.switchTariff.previewError'));
      if (!activeAttempt && switchPreview?.traffic_accounting_mode !== 'split') {
        return subscriptionApi.switchTariff(id, subscriptionId);
      }
      const current = activeAttempt ?? {
        operationId: crypto.randomUUID(),
        preview: switchPreview,
      };
      if (
        !storageKey ||
        !current.preview.expected_terms_hash ||
        !current.preview.expected_end_date ||
        !safeSession.setItem(storageKey, JSON.stringify(current))
      ) {
        throw new Error(t('subscription.splitPurchase.storageUnavailable'));
      }
      setSaved({ key: storageKey, attempt: current });
      return subscriptionApi.switchTariff(id, subscriptionId, {
        operation_id: current.operationId,
        expected_price_kopeks: current.preview.upgrade_cost_kopeks,
        expected_terms_hash: current.preview.expected_terms_hash,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['split-traffic-summary', subscriptionId] });
      if (result.delivery_pending) {
        setNotice('pending');
        return;
      }
      if (storageKey) safeSession.removeItem(storageKey);
      setSaved({ key: storageKey, attempt: null });
      onClose();
      navigate('/subscriptions', { replace: true });
    },
    onError: (error: unknown) => {
      // Backend signal: this subscription can't be switched (it lapsed, or it's
      // a trial). Hand the selected tariff back to the parent so it opens the
      // regular purchase form instead.
      const detail = error instanceof AxiosError ? error.response?.data?.detail : undefined;
      if (
        error instanceof AxiosError &&
        error.response?.status === 409 &&
        detail?.code === 'split_switch_quote_changed'
      ) {
        if (storageKey) safeSession.removeItem(storageKey);
        setSaved({ key: storageKey, attempt: null });
        setNotice('quoteChanged');
        void refetch();
        return;
      }
      if (
        !activeAttempt &&
        switchPreview?.traffic_accounting_mode !== 'split' &&
        !splitDailySwitch &&
        shouldUsePurchaseFlow(error)
      ) {
        const targetTariff = tariffs.find((tariff) => tariff.id === tariffId);
        if (targetTariff) {
          onClose();
          onExpiredFallback(targetTariff);
          queryClient.invalidateQueries({ queryKey: ['purchase-options', subscriptionId] });
        }
      }
    },
  });

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open || !tariffId) return null;
  const target = tariffs.find((tariff) => tariff.id === tariffId);
  const confirmedDevices = switchPreview?.device_limit ?? target?.device_limit;
  const dailyQuote =
    target && !splitDailySwitch ? dailyPriceQuote(target, applyPromoDiscount) : null;
  const targetIsDaily = Boolean(target?.is_daily);
  const periodicSwitch = subscription && !subscription.is_daily && !targetIsDaily;

  return (
    <section
      className="space-y-4 rounded-xl bg-dark-800/50 p-5"
      aria-labelledby="switch-review-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="switch-review-title"
          ref={ref}
          tabIndex={-1}
          className="font-medium text-dark-100 outline-none"
        >
          {t('subscription.switchTariff.reviewTitle')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={switchMutation.isPending || !!activeAttempt}
          className="min-h-11 py-2 text-sm text-dark-300 underline decoration-dark-600 underline-offset-4 hover:text-dark-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-100 disabled:opacity-50"
        >
          {t('subscription.switchTariff.chooseAnother')}
        </button>
      </div>

      {switchPreviewLoading && !activeAttempt ? (
        <SkeletonGroup className="space-y-4">
          <Skeleton variant="card" className="h-40" />
          <Skeleton className="h-12" />
        </SkeletonGroup>
      ) : (previewError && !activeAttempt) || invalidSplitQuote ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-dark-100">{t('subscription.switchTariff.previewError')}</p>
          {previewFailure instanceof AxiosError && previewFailure.response?.data?.detail && (
            <p className="text-sm text-dark-400">{getErrorMessage(previewFailure)}</p>
          )}
          <button type="button" className="btn-secondary" onClick={() => void refetch()}>
            {t('common.retry')}
          </button>
        </div>
      ) : switchPreview ? (
        <>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-dark-400">
                {t('subscription.switchTariff.currentTariff')}
              </dt>
              <dd className="min-w-0 break-words text-end font-medium text-dark-100">
                {switchPreview.current_tariff_name || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-dark-400">{t('subscription.switchTariff.newTariff')}</dt>
              <dd className="min-w-0 break-words text-end font-medium text-accent-400">
                {switchPreview.new_tariff_name}
              </dd>
            </div>
            {splitLimits &&
              (['ordinary', 'bs'] as const).map((group) => {
                const limit = splitLimits[group];
                return (
                  <div key={group} className="flex justify-between gap-3">
                    <dt className="min-w-0 text-sm text-dark-400">
                      {t(`subscription.splitTraffic.${group}`)}
                    </dt>
                    <dd className="min-w-0 break-words text-end text-sm text-dark-100">
                      {limit.mode === 'unlimited'
                        ? t('subscription.splitTraffic.unlimited')
                        : tariffTrafficLabel(limit.limit_gb, t)}
                    </dd>
                  </div>
                );
              })}
            {(target || confirmedDevices !== undefined) && (
              <div className="flex justify-between gap-3">
                <dt className="text-sm text-dark-400">
                  {t(splitLimits ? 'subscription.devices' : 'subscription.switchTariff.newLimits')}
                </dt>
                <dd className="min-w-0 space-y-1 text-end text-sm text-dark-100">
                  {!splitLimits && target && (
                    <div>{tariffTrafficLabel(target.traffic_limit_gb, t)}</div>
                  )}
                  <div>
                    {confirmedDevices === 0
                      ? t('lite.tariff.unlimitedDevices')
                      : t('subscription.devices', { count: confirmedDevices })}
                  </div>
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-dark-400">
                {t(
                  splitDailySwitch
                    ? 'subscription.switchTariff.dailyPaidUntil'
                    : periodicSwitch
                      ? 'subscription.switchTariff.endDate'
                      : 'subscription.switchTariff.remainingDays',
                )}
              </dt>
              <dd className="min-w-0 text-end text-sm text-dark-100">
                {splitDailySwitch
                  ? formatDateOrRaw(switchPreview.paid_window_end, uiLocale(), {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : periodicSwitch
                    ? formatLiteDate(switchPreview.expected_end_date ?? subscription.end_date)
                    : switchPreview.remaining_days}
              </dd>
            </div>
          </dl>

          {subscription && (
            <p className="text-xs leading-relaxed text-dark-400">
              {t(
                splitDailySwitch
                  ? 'subscription.switchTariff.dailyKeepTerm'
                  : periodicSwitch
                    ? 'subscription.switchTariff.keepTerm'
                    : targetIsDaily
                      ? 'subscription.switchTariff.toDailyTerm'
                      : 'subscription.switchTariff.fromDailyTerm',
              )}
            </p>
          )}
          {splitDailySwitch && switchPreview.target_daily_rate_kopeks != null && (
            <p className="text-sm text-dark-300">
              {t('subscription.switchTariff.nextDailyPayment')}:{' '}
              <strong className="font-semibold text-dark-100">
                {formatPrice(switchPreview.target_daily_rate_kopeks)}
              </strong>
            </p>
          )}
          {targetIsDaily && dailyQuote && (
            <p className="text-sm text-dark-300">
              {t('subscription.switchTariff.dailyPayment')}:{' '}
              <strong className="font-semibold text-dark-100">
                {formatPrice(dailyQuote.price)}
              </strong>
            </p>
          )}
          <p className="text-xs leading-relaxed text-dark-400">
            {t(
              switchPreview.traffic_accounting_mode === 'split'
                ? 'subscription.switchTariff.splitAddonsNotice'
                : 'subscription.switchTariff.addonsNotice',
            )}
          </p>

          <div className="flex items-start justify-between gap-3 border-t border-dark-700/50 pt-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-dark-100">
                {t(
                  activeAttempt
                    ? 'subscription.switchTariff.savedAmount'
                    : 'subscription.switchTariff.totalNow',
                )}
              </p>
              {switchPreview.has_enough_balance && !activeAttempt && (
                <p className="text-sm text-dark-400">
                  {t('subscription.switchTariff.balanceAfter', {
                    amount: `${formatAmount((switchPreview.balance_kopeks - switchPreview.upgrade_cost_kopeks) / 100)}\u00a0${currencySymbol}`,
                  })}
                </p>
              )}
            </div>
            <div className="shrink-0 text-end">
              {switchPreview.base_upgrade_cost_kopeks != null &&
                switchPreview.base_upgrade_cost_kopeks > switchPreview.upgrade_cost_kopeks && (
                  <p className="text-sm text-dark-500 line-through">
                    {formatPrice(switchPreview.base_upgrade_cost_kopeks)}
                  </p>
                )}
              <p className="text-lg font-bold tabular-nums text-accent-400">
                {formatPrice(switchPreview.upgrade_cost_kopeks)}
              </p>
            </div>
          </div>
          {!switchPreview.has_enough_balance && switchPreview.upgrade_cost_kopeks > 0 && (
            <InsufficientBalancePrompt
              missingAmountKopeks={switchPreview.missing_amount_kopeks}
              compact
            />
          )}
          <button
            type="button"
            onClick={() => switchMutation.mutate(tariffId)}
            disabled={
              switchMutation.isPending ||
              (!activeAttempt && (!switchPreview.can_switch || switchPreviewFetching))
            }
            className={cn(
              buttonVariants({ variant: 'primary', size: 'lg', fullWidth: true }),
              'shadow-none hover:bg-accent-500 hover:shadow-none active:bg-accent-500 focus-visible:ring-dark-100',
            )}
          >
            {switchMutation.isPending ? (
              <>
                <Spinner className="h-4 w-4 border-current border-t-transparent" />
                {t('common.loading')}
              </>
            ) : (
              t(
                activeAttempt
                  ? 'subscription.switchTariff.check'
                  : 'subscription.switchTariff.confirm',
              )
            )}
          </button>
          {notice && (
            <p role="status" className="text-sm text-dark-300">
              {t(`subscription.switchTariff.${notice}`)}
            </p>
          )}
          {switchMutation.isError &&
            !notice &&
            (!shouldUsePurchaseFlow(switchMutation.error) || !!activeAttempt) && (
              <p role="alert" className="text-sm text-error-400">
                {getErrorMessage(switchMutation.error)}
              </p>
            )}
        </>
      ) : null}
    </section>
  );
}
