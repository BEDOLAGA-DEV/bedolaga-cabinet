import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { subscriptionApi } from '../../../api/subscription';
import { getErrorMessage } from '../../../utils/subscriptionHelpers';
import { useCurrency } from '../../../hooks/useCurrency';
import InsufficientBalancePrompt from '../../InsufficientBalancePrompt';
import type { Tariff } from '../../../types';

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
  onClose: () => void;
  onExpiredFallback: (tariff: Tariff) => void;
}

export function SwitchTariffSheet({
  open,
  tariffId,
  subscriptionId,
  tariffs,
  onClose,
  onExpiredFallback,
}: SwitchTariffSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const ref = useRef<HTMLDivElement>(null);

  const formatPrice = (kopeks: number) =>
    kopeks === 0
      ? t('subscription.free', 'Бесплатно')
      : `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  const { data: switchPreview, isLoading: switchPreviewLoading } = useQuery({
    queryKey: ['tariff-switch-preview', tariffId],
    queryFn: () => subscriptionApi.previewTariffSwitch(tariffId!, subscriptionId),
    enabled: !!tariffId,
  });

  const switchMutation = useMutation({
    mutationFn: (id: number) => subscriptionApi.switchTariff(id, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options', subscriptionId] });
      onClose();
      navigate('/subscriptions', { replace: true });
    },
    onError: (error: unknown) => {
      // Backend signal: this subscription can't be switched (it lapsed, or it's
      // a trial). Hand the selected tariff back to the parent so it opens the
      // regular purchase form instead.
      if (shouldUsePurchaseFlow(error)) {
        const targetTariff = tariffs.find((tariff) => tariff.id === tariffId);
        if (targetTariff) {
          onClose();
          onExpiredFallback(targetTariff);
          queryClient.invalidateQueries({ queryKey: ['purchase-options', subscriptionId] });
        }
      }
    },
  });

  // Smoothly scroll the panel into view when opened.
  useEffect(() => {
    if (open && ref.current) {
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open || !tariffId) return null;

  return (
    <div ref={ref} className="mb-6 space-y-4 rounded-xl bg-dark-800/50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-dark-100">{t('subscription.switchTariff.title')}</h3>
        <button
          onClick={onClose}
          className="text-sm text-dark-400 hover:text-dark-200"
          aria-label={t('common.close', 'Close')}
        >
          ✕
        </button>
      </div>

      {switchPreviewLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : (
        switchPreview &&
        (() => {
          const targetTariff = tariffs.find((tariff) => tariff.id === tariffId);
          const dailyPrice =
            targetTariff?.daily_price_kopeks ?? targetTariff?.price_per_day_kopeks ?? 0;
          const isDailyTariff = dailyPrice > 0;

          return (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2 text-dark-300">
                  <span className="shrink-0">{t('subscription.switchTariff.currentTariff')}</span>
                  <span className="min-w-0 truncate font-medium text-dark-100">
                    {switchPreview.current_tariff_name || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-dark-300">
                  <span className="shrink-0">{t('subscription.switchTariff.newTariff')}</span>
                  <span className="min-w-0 truncate font-medium text-accent-400">
                    {switchPreview.new_tariff_name}
                  </span>
                </div>
                <div className="flex justify-between text-dark-300">
                  <span>{t('subscription.switchTariff.remainingDays')}</span>
                  <span>{switchPreview.remaining_days}</span>
                </div>
              </div>

              {isDailyTariff && (
                <div className="rounded-lg border border-accent-500/30 bg-accent-500/10 p-3 text-center">
                  <div className="text-sm text-dark-300">
                    {t('subscription.switchTariff.dailyPayment')}
                  </div>
                  <div className="text-lg font-bold text-accent-400">{formatPrice(dailyPrice)}</div>
                  <div className="mt-1 text-xs text-dark-400">
                    {t('subscription.switchTariff.dailyChargeDescription')}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-dark-700/50 pt-3">
                <div>
                  <span className="font-medium text-dark-100">
                    {t('subscription.switchTariff.upgradeCost')}
                  </span>
                  {switchPreview.discount_percent && switchPreview.discount_percent > 0 && (
                    <span className="ml-2 inline-block rounded-full bg-success-500/20 px-2 py-0.5 text-xs font-medium text-success-400">
                      -{switchPreview.discount_percent}%
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {switchPreview.discount_percent &&
                    switchPreview.discount_percent > 0 &&
                    switchPreview.base_upgrade_cost_kopeks &&
                    switchPreview.base_upgrade_cost_kopeks > 0 && (
                      <span className="mr-2 text-sm text-dark-500 line-through">
                        {formatPrice(switchPreview.base_upgrade_cost_kopeks)}
                      </span>
                    )}
                  <span
                    className={`text-lg font-bold ${switchPreview.upgrade_cost_kopeks === 0 ? 'text-success-400' : 'text-accent-400'}`}
                  >
                    {switchPreview.upgrade_cost_kopeks > 0
                      ? switchPreview.upgrade_cost_label
                      : t('subscription.switchTariff.free')}
                  </span>
                </div>
              </div>

              {!switchPreview.has_enough_balance && switchPreview.upgrade_cost_kopeks > 0 && (
                <InsufficientBalancePrompt
                  missingAmountKopeks={switchPreview.missing_amount_kopeks}
                  compact
                />
              )}

              <button
                onClick={() => switchMutation.mutate(tariffId)}
                disabled={switchMutation.isPending || !switchPreview.can_switch}
                className="btn-primary w-full py-2.5"
              >
                {switchMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </span>
                ) : (
                  t('subscription.switchTariff.switch')
                )}
              </button>

              {switchMutation.isError &&
                (() => {
                  // Suppress the toast when the purchase-flow fallback already
                  // triggered (expired / trial): the parent is now showing the
                  // regular purchase form, so the raw axios message would mislead.
                  if (shouldUsePurchaseFlow(switchMutation.error)) {
                    return null;
                  }
                  return (
                    <div className="mt-3 text-center text-sm text-error-400">
                      {getErrorMessage(switchMutation.error)}
                    </div>
                  );
                })()}
            </>
          );
        })()
      )}
    </div>
  );
}
