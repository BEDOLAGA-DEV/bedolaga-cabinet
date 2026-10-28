import { tariffTrafficLabel } from '../../../utils/tariffTrafficLabel';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth';
import { TariffDeviceSelector } from './TariffDeviceSelector';
import { subscriptionApi } from '../../../api/subscription';
import { getErrorMessage, getInsufficientBalanceError } from '../../../utils/subscriptionHelpers';
import { useCurrency } from '../../../hooks/useCurrency';
import { usePromoDiscount } from '../../../hooks/usePromoDiscount';
import { dailyPriceQuote } from './dailyPrice';
import { customDaysPrice } from './customDaysPrice';
import { usePlatform } from '../../../platform';
import { openPaymentUrl } from '../../../utils/openPaymentUrl';
import { getMonthlyPriceKopeks } from '../../../utils/pricing';
import { pickBestValue } from '../../../utils/bestValue';
import InsufficientBalancePrompt from '../../InsufficientBalancePrompt';
import type { Tariff, TariffPeriod } from '../../../types';
import { BestValueBadge, bestValueFrame } from '../BestValueBadge';

// ──────────────────────────────────────────────────────────────────
// TariffPurchaseForm
//
// The full per-tariff purchase form: period picker (or daily-tariff
// activate), custom-days toggle + slider, custom-traffic toggle +
// slider, summary, and the confirm CTA. Self-owns:
//   - the purchaseTariff mutation
//   - the auto-scroll-into-view ref + effect on mount
//   - selectedTariffPeriod / customDays / customTrafficGb /
//     useCustomDays / useCustomTraffic (form-internal state, reset
//     by re-mount when the parent passes a new `tariff` via key=)
//
// The parent (SubscriptionPurchase) supplies the chosen tariff,
// the current balance (for inline insufficient-balance prompts),
// the subscription id (for the renew-this-subscription flow), and
// onBack to clear its own selection state.
// ──────────────────────────────────────────────────────────────────

export interface TariffPurchaseFormProps {
  tariff: Tariff;
  subscriptionId: number | undefined;
  balanceKopeks: number | undefined;
  /** СБП-оформление (Platega recurrent) доступно — показать вторую CTA. */
  sbpPurchaseEnabled?: boolean;
  /** Оформление привязкой Lava доступно — показать вторую CTA. */
  lavaPurchaseEnabled?: boolean;
  /** Оформление привязкой Cashera доступно — показать вторую CTA. */
  casheraPurchaseEnabled?: boolean;
  onBack: () => void;
}

export function TariffPurchaseForm({
  tariff,
  subscriptionId,
  balanceKopeks,
  sbpPurchaseEnabled = false,
  lavaPurchaseEnabled = false,
  casheraPurchaseEnabled = false,
  onBack,
}: TariffPurchaseFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const { applyPromoDiscount } = usePromoDiscount();
  // Та же котировка, что на карточке тарифа: серверная цена + промокод один раз.
  const dailyQuote = dailyPriceQuote(tariff, applyPromoDiscount);
  const customDayUnitPrice =
    tariff.custom_days_pricing?.price_per_day_kopeks ?? tariff.price_per_day_kopeks ?? 0;
  const { openLink, platform } = usePlatform();
  const ref = useRef<HTMLDivElement>(null);
  const checkoutAttempt = useRef<{
    signature: string;
    id: string;
    devices?: { selected_device_limit: number; quote_id: string };
  } | null>(null);
  const [uncertainCheckout, setUncertainCheckout] = useState(false);
  const checkoutRequestSent = useRef(false);

  const formatPrice = (kopeks: number) =>
    kopeks === 0
      ? t('subscription.free', 'Бесплатно')
      : `${formatAmount(kopeks / 100)}\u00A0${currencySymbol}`;

  // Form-internal state — seeded from the tariff prop. Resets via
  // `key={tariff.id}` on the parent's render.
  // Отмеченный оператором период выбран сразу: рамка «Выгодно» и итог внизу
  // должны говорить об одном и том же периоде.
  const [selectedTariffPeriod, setSelectedTariffPeriod] = useState<TariffPeriod | null>(
    pickBestValue(tariff.periods) || tariff.periods[0] || null,
  );
  const [customDays, setCustomDays] = useState<number>(30);
  const [customTrafficGb, setCustomTrafficGb] = useState<number>(50);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [useCustomTraffic, setUseCustomTraffic] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<number | undefined>();
  const [deviceInputValid, setDeviceInputValid] = useState(true);
  const quoteUserId = useAuthStore((state) => state.user?.id);
  const quoteDays = useCustomDays ? customDays : (selectedTariffPeriod?.days ?? 30);
  const quoteTraffic =
    useCustomTraffic && tariff.custom_traffic_enabled ? customTrafficGb : undefined;
  const devicePreviewEnabled = Boolean(
    tariff.purchase_device_selection_supported && !tariff.is_daily,
  );
  const deviceQuoteQuery = useQuery({
    queryKey: [
      'tariff-device-quote',
      quoteUserId,
      tariff.id,
      subscriptionId,
      quoteDays,
      quoteTraffic,
      selectedDevices,
    ],
    queryFn: () =>
      subscriptionApi.previewTariffPurchase({
        tariff_id: tariff.id,
        period_days: quoteDays,
        traffic_gb: quoteTraffic,
        subscription_id: subscriptionId,
        selected_device_limit: selectedDevices,
      }),
    enabled: devicePreviewEnabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    placeholderData: (previous, query) =>
      query?.queryKey[1] === quoteUserId &&
      query?.queryKey[2] === tariff.id &&
      query?.queryKey[3] === subscriptionId
        ? previous
        : undefined,
  });
  const deviceQuote = devicePreviewEnabled ? deviceQuoteQuery.data : undefined;
  useEffect(() => {
    if (
      deviceQuote?.device_selection.selectable &&
      selectedDevices === undefined &&
      !deviceQuoteQuery.isPlaceholderData
    ) {
      setSelectedDevices(deviceQuote.device_selection.effective_limit);
    }
  }, [deviceQuote, deviceQuoteQuery.isPlaceholderData, selectedDevices]);
  const quoteBlocked =
    devicePreviewEnabled &&
    (deviceQuoteQuery.isFetching ||
      deviceQuoteQuery.isPlaceholderData ||
      !deviceQuote ||
      deviceQuoteQuery.isError ||
      (deviceQuote.device_selection.selectable && selectedDevices === undefined));
  const selectedExtras =
    selectedDevices !== undefined &&
    selectedDevices >
      (deviceQuote?.device_selection.included_limit ??
        tariff.base_device_limit ??
        tariff.device_limit);
  const retryUncertainCheckout =
    uncertainCheckout &&
    checkoutAttempt.current?.signature ===
      JSON.stringify([tariff.id, quoteDays, quoteTraffic, subscriptionId, selectedDevices]);

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      checkoutRequestSent.current = false;
      if (retryUncertainCheckout && checkoutAttempt.current && deviceInputValid) {
        checkoutRequestSent.current = true;
        return subscriptionApi.purchaseTariff(
          tariff.id,
          quoteDays,
          quoteTraffic,
          subscriptionId,
          checkoutAttempt.current.id,
          checkoutAttempt.current.devices,
        );
      }
      if (quoteBlocked || !deviceInputValid)
        throw new Error(t('subscription.purchaseDevices.waitForPrice'));
      if (deviceQuote && Date.parse(deviceQuote.expires_at) <= Date.now()) {
        await deviceQuoteQuery.refetch();
        throw new Error(t('subscription.purchaseDevices.reviewPrice'));
      }
      const isDailyTariff =
        tariff.is_daily || (tariff.daily_price_kopeks && tariff.daily_price_kopeks > 0);
      const days = isDailyTariff
        ? 1
        : useCustomDays
          ? customDays
          : selectedTariffPeriod?.days || 30;
      const trafficGb =
        useCustomTraffic && tariff.custom_traffic_enabled ? customTrafficGb : undefined;
      // Forward the subscription_id when the user landed here via the
      // "Renew this subscription" flow (?subscriptionId=N). The backend
      // uses it to resolve the exact target row by ID, avoiding the
      // race with concurrent panel webhooks that would otherwise hit
      // the partial UNIQUE on uq_subscriptions_user_tariff_active.
      if (isDailyTariff) {
        checkoutRequestSent.current = true;
        return subscriptionApi.purchaseTariff(tariff.id, days, trafficGb, subscriptionId);
      }
      const signature = JSON.stringify([
        tariff.id,
        days,
        trafficGb,
        subscriptionId,
        selectedDevices,
      ]);
      if (checkoutAttempt.current?.signature !== signature) {
        // A retry keeps its identity even if the balance or quote was refreshed.
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        checkoutAttempt.current = { signature, id };
      }
      checkoutAttempt.current.devices =
        selectedDevices !== undefined && deviceQuote
          ? { selected_device_limit: selectedDevices, quote_id: deviceQuote.quote_id }
          : undefined;
      checkoutRequestSent.current = true;
      return subscriptionApi.purchaseTariff(
        tariff.id,
        days,
        trafficGb,
        subscriptionId,
        checkoutAttempt.current.id,
        checkoutAttempt.current.devices,
      );
    },
    onError: (error) => {
      const status = (error as { response?: { status?: number } }).response?.status;
      // A transport failure or 5xx can follow a committed purchase. Retry the
      // original identity and consent even if the quote subsequently expires.
      setUncertainCheckout(checkoutRequestSent.current && (status === undefined || status >= 500));
      if (devicePreviewEnabled && status !== undefined && status < 500) deviceQuoteQuery.refetch();
    },
    onSuccess: () => {
      setUncertainCheckout(false);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      navigate('/subscriptions', { replace: true });
    },
  });

  // СБП-оформление: первое списание = подтверждение привязки в банке; период
  // на форме не участвует — списания идут по каденс-правилу тарифа.
  const sbpPurchaseMutation = useMutation({
    mutationFn: () =>
      subscriptionApi.purchaseWithSbpRecurring(tariff.id, subscriptionId ?? undefined),
    onSuccess: (data) => {
      if (data.redirect_url) {
        openPaymentUrl(data.redirect_url, platform, openLink);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['sbp-recurring', data.subscription_id] });
      navigate('/subscriptions', { replace: true });
    },
  });

  const sbpPurchaseButton = sbpPurchaseEnabled && !selectedExtras && (
    <>
      <button
        onClick={() => sbpPurchaseMutation.mutate()}
        disabled={sbpPurchaseMutation.isPending || purchaseMutation.isPending}
        className="mt-2 w-full rounded-xl border border-accent-500/40 bg-accent-500/10 py-3 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/20 disabled:opacity-50"
      >
        {sbpPurchaseMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t('common.loading')}
          </span>
        ) : (
          t('subscription.sbpRecurring.purchaseButton')
        )}
      </button>
      <div className="mt-1.5 text-center text-[11px] text-dark-500">
        {t('subscription.sbpRecurring.purchaseHint')}
      </div>
      {sbpPurchaseMutation.isError && (
        <div className="mt-2 text-center text-sm text-error-400">
          {getErrorMessage(sbpPurchaseMutation.error)}
        </div>
      )}
    </>
  );

  const lavaPurchaseMutation = useMutation({
    mutationFn: () =>
      subscriptionApi.purchaseWithLavaRecurring(tariff.id, subscriptionId ?? undefined),
    onSuccess: (data) => {
      if (data.redirect_url) {
        openPaymentUrl(data.redirect_url, platform, openLink);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['lava-recurring', data.subscription_id] });
      navigate('/subscriptions', { replace: true });
    },
  });

  const lavaPurchaseButton = lavaPurchaseEnabled && !selectedExtras && (
    <>
      <button
        onClick={() => lavaPurchaseMutation.mutate()}
        disabled={lavaPurchaseMutation.isPending || purchaseMutation.isPending}
        className="mt-2 w-full rounded-xl border border-accent-500/40 bg-accent-500/10 py-3 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/20 disabled:opacity-50"
      >
        {lavaPurchaseMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t('common.loading')}
          </span>
        ) : (
          t('subscription.lavaRecurring.purchaseButton')
        )}
      </button>
      <div className="mt-1.5 text-center text-[11px] text-dark-500">
        {t('subscription.lavaRecurring.purchaseHint')}
      </div>
      {lavaPurchaseMutation.isError && (
        <div className="mt-2 text-center text-sm text-error-400">
          {getErrorMessage(lavaPurchaseMutation.error)}
        </div>
      )}
    </>
  );

  const casheraPurchaseMutation = useMutation({
    mutationFn: () =>
      subscriptionApi.purchaseWithCasheraRecurring(tariff.id, subscriptionId ?? undefined),
    onSuccess: (data) => {
      if (data.redirect_url) {
        openPaymentUrl(data.redirect_url, platform, openLink);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['cashera-recurring', data.subscription_id] });
      navigate('/subscriptions', { replace: true });
    },
  });

  const casheraPurchaseButton = casheraPurchaseEnabled && !selectedExtras && (
    <>
      <button
        onClick={() => casheraPurchaseMutation.mutate()}
        disabled={casheraPurchaseMutation.isPending || purchaseMutation.isPending}
        className="mt-2 w-full rounded-xl border border-accent-500/40 bg-accent-500/10 py-3 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/20 disabled:opacity-50"
      >
        {casheraPurchaseMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t('common.loading')}
          </span>
        ) : (
          t('subscription.casheraRecurring.purchaseButton')
        )}
      </button>
      <div className="mt-1.5 text-center text-[11px] text-dark-500">
        {t('subscription.casheraRecurring.purchaseHint')}
      </div>
      {casheraPurchaseMutation.isError && (
        <div className="mt-2 text-center text-sm text-error-400">
          {getErrorMessage(casheraPurchaseMutation.error)}
        </div>
      )}
    </>
  );

  // Smooth scroll the form into view when first mounted.
  useEffect(() => {
    if (ref.current) {
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div ref={ref} className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-lg font-medium text-dark-100">{tariff.name}</h3>
        <button onClick={onBack} className="shrink-0 text-dark-400 hover:text-dark-200">
          ← {t('common.back')}
        </button>
      </div>

      {/* Tariff Info */}
      <div className="rounded-xl bg-dark-800/50 p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-dark-500">{t('subscription.traffic')}:</span>
            <span className="ml-2 text-dark-200">
              {tariffTrafficLabel(tariff.traffic_limit_gb, t)}
            </span>
          </div>
          <div>
            <span className="text-dark-500">{t('subscription.devices')}:</span>
            <span className="ml-2 text-dark-200">
              {(selectedDevices ??
                deviceQuote?.device_selection.effective_limit ??
                tariff.device_limit) === 0
                ? '∞'
                : (selectedDevices ??
                  deviceQuote?.device_selection.effective_limit ??
                  tariff.device_limit)}
              {!deviceQuote && tariff.extra_devices_count > 0 && (
                <span className="ml-1 text-xs text-accent-400">
                  (+{tariff.extra_devices_count})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Tariff Purchase */}
      {tariff.is_daily || (tariff.daily_price_kopeks && tariff.daily_price_kopeks > 0) ? (
        <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 p-5">
          <div className="mb-4 text-center">
            <div className="mb-2 text-sm text-dark-400">
              {t('subscription.dailyPurchase.costPerDay')}
            </div>
            <div className="text-3xl font-bold text-accent-400">
              {formatPrice(dailyQuote?.price ?? 0)}
            </div>
            {dailyQuote?.original && dailyQuote.original > dailyQuote.price && (
              <div className="mt-1 flex items-center justify-center gap-2 text-sm">
                <span className="text-dark-500 line-through">
                  {formatPrice(dailyQuote.original)}
                </span>
                {dailyQuote.percent != null && dailyQuote.percent > 0 && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      dailyQuote.isPromoGroup
                        ? 'bg-success-500/20 text-success-400'
                        : 'bg-warning-500/20 text-warning-400'
                    }`}
                  >
                    -{dailyQuote.percent}%
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm text-dark-400">
            <div className="flex items-start gap-2">
              <span className="text-accent-400">•</span>
              <span>{t('subscription.dailyPurchase.chargedDaily')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent-400">•</span>
              <span>{t('subscription.dailyPurchase.canPause')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent-400">•</span>
              <span>{t('subscription.dailyPurchase.pausedOnLowBalance')}</span>
            </div>
          </div>

          {(() => {
            const dailyPrice = dailyQuote?.price ?? 0;
            const hasEnoughBalance = balanceKopeks !== undefined && dailyPrice <= balanceKopeks;

            return (
              <div className="mt-6">
                {balanceKopeks !== undefined && !hasEnoughBalance && (
                  <InsufficientBalancePrompt
                    missingAmountKopeks={dailyPrice - balanceKopeks}
                    compact
                    className="mb-4"
                  />
                )}

                <button
                  onClick={() => purchaseMutation.mutate()}
                  disabled={purchaseMutation.isPending}
                  className="btn-primary w-full py-3"
                >
                  {purchaseMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('common.loading')}
                    </span>
                  ) : (
                    t('subscription.dailyPurchase.activate', {
                      price: formatPrice(dailyPrice),
                    })
                  )}
                </button>

                {sbpPurchaseButton}
                {lavaPurchaseButton}
                {casheraPurchaseButton}

                {purchaseMutation.isError &&
                  !getInsufficientBalanceError(purchaseMutation.error) && (
                    <div className="mt-3 text-center text-sm text-error-400">
                      {getErrorMessage(purchaseMutation.error)}
                    </div>
                  )}
                {purchaseMutation.isError &&
                  getInsufficientBalanceError(purchaseMutation.error) && (
                    <div className="mt-3">
                      <InsufficientBalancePrompt
                        missingAmountKopeks={
                          getInsufficientBalanceError(purchaseMutation.error)?.missingAmount ||
                          dailyPrice - (balanceKopeks || 0)
                        }
                        compact
                      />
                    </div>
                  )}
              </div>
            );
          })()}
        </div>
      ) : (
        <>
          {/* Period Selection for non-daily tariffs */}
          <div>
            <div className="mb-3 text-sm text-dark-400">{t('subscription.selectPeriod')}</div>

            {tariff.periods.length > 0 && !useCustomDays && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {tariff.periods.map((period) => {
                  const promoPeriod = applyPromoDiscount(
                    period.price_kopeks,
                    period.original_price_kopeks,
                  );
                  const displayDiscount = promoPeriod.percent;
                  const displayOriginal = promoPeriod.original;
                  const displayPrice = promoPeriod.price;
                  const displayPerMonth = getMonthlyPriceKopeks(displayPrice, period.days);
                  const isSelectedPeriod =
                    selectedTariffPeriod?.days === period.days && !useCustomDays;

                  return (
                    <button
                      key={period.days}
                      onClick={() => {
                        setSelectedTariffPeriod(period);
                        setUseCustomDays(false);
                      }}
                      className={`relative rounded-xl p-4 text-left transition-all ${
                        period.is_highlighted
                          ? `${bestValueFrame(isSelectedPeriod)} ${isSelectedPeriod ? 'bg-accent-500/10' : 'bg-dark-800/50'}`
                          : isSelectedPeriod
                            ? 'border border-accent-500 bg-accent-500/10'
                            : 'border border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
                      }`}
                    >
                      {/* Плашка первой строкой, как в продлении; скидка — в правом
                          верхнем углу поверх рамки, они не пересекаются. */}
                      {period.is_highlighted && <BestValueBadge className="mb-2" />}
                      {displayDiscount != null && displayDiscount > 0 && (
                        <div
                          className={`absolute -right-2 -top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                            promoPeriod.isPromoGroup ? 'bg-success-500' : 'bg-warning-500'
                          }`}
                        >
                          -{displayDiscount}%
                        </div>
                      )}
                      <div className="text-lg font-semibold text-dark-100">{period.label}</div>
                      {/* Цена не рвётся между числом и знаком валюты: две цены в
                          карточку шириной в полэкрана не влезают, и без переноса
                          целиком «₽» уезжал на свою строку. */}
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="whitespace-nowrap font-medium text-accent-400">
                          {formatPrice(displayPrice)}
                        </span>
                        {displayOriginal && displayOriginal > displayPrice && (
                          <span className="whitespace-nowrap text-sm text-dark-500 line-through">
                            {formatPrice(displayOriginal)}
                          </span>
                        )}
                      </div>
                      {displayPerMonth !== null && (
                        <div className="mt-1 text-xs text-dark-500">
                          {formatPrice(displayPerMonth)}/{t('subscription.month')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* No periods available fallback */}
            {tariff.periods.length === 0 &&
              !useCustomDays &&
              !(tariff.custom_days_enabled && customDayUnitPrice > 0) && (
                <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-4 text-center">
                  <div className="mb-2 text-sm font-medium text-warning-400">
                    {t('subscription.noPeriodsAvailable')}
                  </div>
                  <div className="text-xs text-dark-400">
                    {t('subscription.noPeriodsAvailableHint')}
                  </div>
                  <button onClick={onBack} className="btn-secondary mt-3 px-4 py-2 text-sm">
                    {t('subscription.chooseDifferentTariff')}
                  </button>
                </div>
              )}

            {/* Custom days option */}
            {tariff.custom_days_enabled && customDayUnitPrice > 0 && (
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-dark-200">
                    {t('subscription.customDays.title')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseCustomDays(!useCustomDays)}
                    role="switch"
                    aria-checked={useCustomDays}
                    aria-label={t('subscription.customDays.title')}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      useCustomDays ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        useCustomDays ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {useCustomDays && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={tariff.min_days ?? 1}
                        max={tariff.max_days ?? 365}
                        value={customDays}
                        onChange={(e) => setCustomDays(parseInt(e.target.value))}
                        className="min-w-0 flex-1 accent-accent-500"
                      />
                      <input
                        type="number"
                        value={customDays}
                        min={tariff.min_days ?? 1}
                        max={tariff.max_days ?? 365}
                        onChange={(e) =>
                          setCustomDays(
                            Math.max(
                              tariff.min_days ?? 1,
                              Math.min(
                                tariff.max_days ?? 365,
                                parseInt(e.target.value) || (tariff.min_days ?? 1),
                              ),
                            ),
                          )
                        }
                        className="w-20 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-center text-dark-100"
                      />
                    </div>
                    {(() => {
                      const { price: basePrice, original: existingOriginal } = customDaysPrice(
                        tariff,
                        customDays,
                      );
                      const promoCustom = applyPromoDiscount(basePrice, existingOriginal);
                      return (
                        <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                          {/* «/день» — уже в переводе; второй «/» давал «₽//день». */}
                          <span className="text-dark-400">
                            {t('subscription.days', { count: customDays })} ×{' '}
                            <span className="whitespace-nowrap">
                              {formatPrice(customDayUnitPrice)}
                              {t('subscription.customDays.perDay')}
                            </span>
                            {tariff.extra_devices_count > 0 && (
                              <span className="block">
                                + {t('subscription.extraDevices')} ({tariff.extra_devices_count})
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="font-medium text-accent-400">
                              {formatPrice(promoCustom.price)}
                            </span>
                            {promoCustom.original && promoCustom.original > promoCustom.price && (
                              <>
                                <span className="text-xs text-dark-500 line-through">
                                  {formatPrice(promoCustom.original)}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-xs ${
                                    promoCustom.isPromoGroup
                                      ? 'bg-success-500/20 text-success-400'
                                      : 'bg-warning-500/20 text-warning-400'
                                  }`}
                                >
                                  -{promoCustom.percent}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom traffic option */}
          {tariff.custom_traffic_enabled && (tariff.traffic_price_per_gb_kopeks ?? 0) > 0 && (
            <div>
              <div className="mb-3 text-sm text-dark-400">
                {t('subscription.customTraffic.label')}
              </div>
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-dark-200">
                    {t('subscription.customTraffic.selectVolume')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseCustomTraffic(!useCustomTraffic)}
                    role="switch"
                    aria-checked={useCustomTraffic}
                    aria-label={t('subscription.customTraffic.selectVolume')}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      useCustomTraffic ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        useCustomTraffic ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {!useCustomTraffic && (
                  <div className="text-sm text-dark-400">
                    {t('subscription.customTraffic.default', {
                      label: tariffTrafficLabel(tariff.traffic_limit_gb, t),
                    })}
                  </div>
                )}
                {useCustomTraffic && (
                  <div className="space-y-3">
                    {/* Ползунок сжимается, поле с «ГБ» — нет: на 360 «ГБ» упиралось
                        в рамку карточки. */}
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={tariff.min_traffic_gb ?? 1}
                        max={tariff.max_traffic_gb ?? 1000}
                        value={customTrafficGb}
                        onChange={(e) => setCustomTrafficGb(parseInt(e.target.value))}
                        className="min-w-0 flex-1 accent-accent-500"
                      />
                      <div className="flex shrink-0 items-center gap-2">
                        <input
                          type="number"
                          value={customTrafficGb}
                          min={tariff.min_traffic_gb ?? 1}
                          max={tariff.max_traffic_gb ?? 1000}
                          onChange={(e) =>
                            setCustomTrafficGb(
                              Math.max(
                                tariff.min_traffic_gb ?? 1,
                                Math.min(
                                  tariff.max_traffic_gb ?? 1000,
                                  parseInt(e.target.value) || (tariff.min_traffic_gb ?? 1),
                                ),
                              ),
                            )
                          }
                          className="w-20 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-center text-dark-100"
                        />
                        <span className="text-dark-400">{t('common.units.gb')}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                      <span className="text-dark-400">
                        {customTrafficGb} {t('common.units.gb')} ×{' '}
                        <span className="whitespace-nowrap">
                          {formatPrice(tariff.traffic_price_per_gb_kopeks ?? 0)}/
                          {t('common.units.gb')}
                        </span>
                      </span>
                      <span className="whitespace-nowrap font-medium text-accent-400">
                        +{formatPrice(customTrafficGb * (tariff.traffic_price_per_gb_kopeks ?? 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary & Purchase */}
          {deviceQuote?.device_selection.selectable && (
            <TariffDeviceSelector
              value={selectedDevices ?? deviceQuote.device_selection.effective_limit}
              min={
                deviceQuote.device_selection.min_limit ??
                deviceQuote.device_selection.included_limit
              }
              max={
                deviceQuote.device_selection.max_limit ??
                deviceQuote.device_selection.effective_limit
              }
              included={deviceQuote.device_selection.included_limit}
              disabled={purchaseMutation.isPending}
              onChange={setSelectedDevices}
              onValidityChange={setDeviceInputValid}
            />
          )}
          {deviceQuoteQuery.isError && devicePreviewEnabled && (
            <div role="alert" className="text-sm text-error-400">
              {t('subscription.purchaseDevices.priceUnavailable')}{' '}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => deviceQuoteQuery.refetch()}
              >
                {t('common.retry')}
              </button>
            </div>
          )}
          {(selectedTariffPeriod || useCustomDays) && (
            <div className="rounded-xl bg-dark-800/50 p-5">
              {(() => {
                const customQuote = customDaysPrice(tariff, customDays);
                const basePeriodPrice = useCustomDays
                  ? customQuote.price
                  : selectedTariffPeriod?.price_kopeks || 0;
                const existingPeriodOriginal = useCustomDays
                  ? customQuote.original
                  : selectedTariffPeriod?.original_price_kopeks &&
                      selectedTariffPeriod.original_price_kopeks > selectedTariffPeriod.price_kopeks
                    ? selectedTariffPeriod.original_price_kopeks
                    : undefined;
                const promoPeriod = applyPromoDiscount(basePeriodPrice, existingPeriodOriginal);

                const trafficPrice =
                  useCustomTraffic && tariff.custom_traffic_enabled
                    ? customTrafficGb * (tariff.traffic_price_per_gb_kopeks ?? 0)
                    : 0;

                const totalPrice = deviceQuote?.total_kopeks ?? promoPeriod.price + trafficPrice;
                const originalTotal = deviceQuote
                  ? deviceQuote.discount_kopeks > 0
                    ? deviceQuote.total_kopeks + deviceQuote.discount_kopeks
                    : null
                  : promoPeriod.original
                    ? promoPeriod.original + trafficPrice
                    : null;

                return (
                  <>
                    {deviceQuote ? (
                      <div
                        className="mb-4 space-y-2 text-sm text-dark-300"
                        aria-busy={quoteBlocked}
                      >
                        <div className="flex justify-between gap-3">
                          <span>{t('subscription.baseTariff')}</span>
                          <span>{formatPrice(deviceQuote.tariff_cost_kopeks)}</span>
                        </div>
                        {deviceQuote.devices_cost_kopeks > 0 && (
                          <div className="flex justify-between gap-3">
                            <span>
                              {t('subscription.extraDevices')} (
                              {deviceQuote.device_selection.effective_limit -
                                deviceQuote.device_selection.included_limit}
                              )
                            </span>
                            <span>+{formatPrice(deviceQuote.devices_cost_kopeks)}</span>
                          </div>
                        )}
                        {deviceQuote.traffic_cost_kopeks > 0 && (
                          <div className="flex justify-between gap-3">
                            <span>{t('subscription.summary.traffic', { gb: quoteTraffic })}</span>
                            <span>+{formatPrice(deviceQuote.traffic_cost_kopeks)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4 space-y-2">
                        {useCustomDays ? (
                          <div className="flex flex-wrap justify-between gap-x-3 text-sm text-dark-300">
                            <span>
                              {t('subscription.stepPeriod')}:{' '}
                              {t('subscription.days', { count: customDays })}
                            </span>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span>{formatPrice(promoPeriod.price)}</span>
                              {promoPeriod.original && promoPeriod.original > promoPeriod.price && (
                                <span className="text-xs text-dark-500 line-through">
                                  {formatPrice(promoPeriod.original)}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          selectedTariffPeriod && (
                            <>
                              {(selectedTariffPeriod.extra_devices_count ?? 0) > 0 &&
                              selectedTariffPeriod.base_tariff_price_kopeks ? (
                                <>
                                  <div className="flex flex-wrap justify-between gap-x-3 text-sm text-dark-300">
                                    <span>
                                      {t('subscription.baseTariff')}: {selectedTariffPeriod.label}
                                    </span>
                                    <span>
                                      {formatPrice(selectedTariffPeriod.base_tariff_price_kopeks)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap justify-between gap-x-3 text-sm text-dark-300">
                                    <span>
                                      {t('subscription.extraDevices')} (
                                      {selectedTariffPeriod.extra_devices_count})
                                    </span>
                                    <span>
                                      +
                                      {formatPrice(
                                        selectedTariffPeriod.extra_devices_cost_kopeks ?? 0,
                                      )}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-wrap justify-between gap-x-3 text-sm text-dark-300">
                                  <span>
                                    {t('subscription.summary.period', {
                                      label: selectedTariffPeriod.label,
                                    })}
                                  </span>
                                  <div className="flex items-center gap-2 whitespace-nowrap">
                                    <span>{formatPrice(promoPeriod.price)}</span>
                                    {promoPeriod.original &&
                                      promoPeriod.original > promoPeriod.price && (
                                        <span className="text-xs text-dark-500 line-through">
                                          {formatPrice(promoPeriod.original)}
                                        </span>
                                      )}
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        )}
                        {useCustomTraffic && tariff.custom_traffic_enabled && (
                          <div className="flex flex-wrap justify-between gap-x-3 text-sm text-dark-300">
                            <span>
                              {t('subscription.summary.traffic', { gb: customTrafficGb })}
                            </span>
                            <span>+{formatPrice(trafficPrice)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!deviceQuote && promoPeriod.percent && (
                      <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 p-2">
                        <span className="text-sm font-medium text-warning-400">
                          {t('promo.discountApplied')} -{promoPeriod.percent}%
                        </span>
                      </div>
                    )}

                    <div className="mb-4 flex items-center justify-between gap-3 border-t border-dark-700/50 pt-2">
                      <span className="font-medium text-dark-100">{t('subscription.total')}</span>
                      <div className="text-right">
                        <span className="whitespace-nowrap text-2xl font-bold text-accent-400">
                          {quoteBlocked
                            ? t('subscription.purchaseDevices.calculating')
                            : formatPrice(totalPrice)}
                        </span>
                        {originalTotal && (
                          <div className="text-sm text-dark-500 line-through">
                            {formatPrice(originalTotal)}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => purchaseMutation.mutate()}
                      disabled={
                        purchaseMutation.isPending ||
                        (quoteBlocked && !retryUncertainCheckout) ||
                        !deviceInputValid
                      }
                      className="btn-primary w-full py-3"
                    >
                      {purchaseMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {t('common.loading')}
                        </span>
                      ) : (
                        t('subscription.purchase')
                      )}
                    </button>

                    {sbpPurchaseButton}
                    {lavaPurchaseButton}
                    {casheraPurchaseButton}
                    {selectedExtras &&
                      (sbpPurchaseEnabled || lavaPurchaseEnabled || casheraPurchaseEnabled) && (
                        <p className="mt-3 text-center text-xs text-dark-400">
                          {t('subscription.purchaseDevices.balanceOnly')}
                        </p>
                      )}
                  </>
                );
              })()}

              {purchaseMutation.isError && !getInsufficientBalanceError(purchaseMutation.error) && (
                <div className="mt-3 text-center text-sm text-error-400">
                  {getErrorMessage(purchaseMutation.error)}
                </div>
              )}
              {purchaseMutation.isError && getInsufficientBalanceError(purchaseMutation.error) && (
                <div className="mt-3">
                  <InsufficientBalancePrompt
                    missingAmountKopeks={
                      getInsufficientBalanceError(purchaseMutation.error)?.missingAmount || 0
                    }
                    compact
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
