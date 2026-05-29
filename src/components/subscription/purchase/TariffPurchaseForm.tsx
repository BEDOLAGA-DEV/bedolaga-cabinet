import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../../../api/subscription';
import { getErrorMessage, getInsufficientBalanceError } from '../../../utils/subscriptionHelpers';
import { useCurrency } from '../../../hooks/useCurrency';
import { usePromoDiscount } from '../../../hooks/usePromoDiscount';
import InsufficientBalancePrompt from '../../InsufficientBalancePrompt';
import type { Tariff, TariffPeriod } from '../../../types';

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
  onBack: () => void;
}

export function TariffPurchaseForm({
  tariff,
  subscriptionId,
  balanceKopeks,
  onBack,
}: TariffPurchaseFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const { applyPromoDiscount } = usePromoDiscount();
  const ref = useRef<HTMLDivElement>(null);

  const formatPrice = (kopeks: number) =>
    kopeks === 0
      ? t('subscription.free', 'Бесплатно')
      : `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  // Form-internal state — seeded from the tariff prop. Resets via
  // `key={tariff.id}` on the parent's render.
  const [selectedTariffPeriod, setSelectedTariffPeriod] = useState<TariffPeriod | null>(
    tariff.periods[0] || null,
  );
  const [customDays, setCustomDays] = useState<number>(30);
  const [customTrafficGb, setCustomTrafficGb] = useState<number>(50);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [useCustomTraffic, setUseCustomTraffic] = useState(false);

  const purchaseMutation = useMutation({
    mutationFn: () => {
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
      return subscriptionApi.purchaseTariff(
        tariff.id,
        days,
        trafficGb,
        subscriptionId ?? undefined,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      navigate('/subscriptions', { replace: true });
    },
  });

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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-dark-100">{tariff.name}</h3>
        <button onClick={onBack} className="text-dark-400 hover:text-dark-200">
          ← {t('common.back')}
        </button>
      </div>

      {/* Tariff Info */}
      <div className="rounded-xl bg-dark-800/50 p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-dark-500">{t('subscription.traffic')}:</span>
            <span className="ml-2 text-dark-200">{tariff.traffic_limit_label}</span>
          </div>
          <div>
            <span className="text-dark-500">{t('subscription.devices')}:</span>
            <span className="ml-2 text-dark-200">
              {tariff.device_limit === 0 ? '∞' : tariff.device_limit}
              {tariff.extra_devices_count > 0 && (
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
              {formatPrice(tariff.daily_price_kopeks || 0)}
            </div>
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
            const dailyPrice = tariff.daily_price_kopeks || 0;
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
                  const displayPerMonth =
                    displayPrice !== period.price_kopeks
                      ? Math.round(displayPrice / Math.max(1, period.days / 30))
                      : period.price_per_month_kopeks;

                  return (
                    <button
                      key={period.days}
                      onClick={() => {
                        setSelectedTariffPeriod(period);
                        setUseCustomDays(false);
                      }}
                      className={`relative rounded-xl border p-4 text-left transition-all ${
                        selectedTariffPeriod?.days === period.days && !useCustomDays
                          ? 'border-accent-500 bg-accent-500/10'
                          : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
                      }`}
                    >
                      {displayDiscount && displayDiscount > 0 && (
                        <div
                          className={`absolute -right-2 -top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                            promoPeriod.isPromoGroup ? 'bg-success-500' : 'bg-warning-500'
                          }`}
                        >
                          -{displayDiscount}%
                        </div>
                      )}
                      <div className="text-lg font-semibold text-dark-100">{period.label}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-accent-400">
                          {formatPrice(displayPrice)}
                        </span>
                        {displayOriginal && displayOriginal > displayPrice && (
                          <span className="text-sm text-dark-500 line-through">
                            {formatPrice(displayOriginal)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-dark-500">
                        {formatPrice(displayPerMonth)}/{t('subscription.month')}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* No periods available fallback */}
            {tariff.periods.length === 0 &&
              !useCustomDays &&
              !(tariff.custom_days_enabled && (tariff.price_per_day_kopeks ?? 0) > 0) && (
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
            {tariff.custom_days_enabled && (tariff.price_per_day_kopeks ?? 0) > 0 && (
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
                        className="flex-1 accent-accent-500"
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
                      const basePrice = customDays * (tariff.price_per_day_kopeks ?? 0);
                      const existingOriginal =
                        tariff.original_price_per_day_kopeks &&
                        tariff.original_price_per_day_kopeks > (tariff.price_per_day_kopeks ?? 0)
                          ? customDays * tariff.original_price_per_day_kopeks
                          : undefined;
                      const promoCustom = applyPromoDiscount(basePrice, existingOriginal);
                      return (
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">
                            {t('subscription.days', { count: customDays })} ×{' '}
                            {formatPrice(tariff.price_per_day_kopeks ?? 0)}/
                            {t('subscription.customDays.perDay')}
                          </span>
                          <div className="flex items-center gap-2">
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
                      label: tariff.traffic_limit_label,
                    })}
                  </div>
                )}
                {useCustomTraffic && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={tariff.min_traffic_gb ?? 1}
                        max={tariff.max_traffic_gb ?? 1000}
                        value={customTrafficGb}
                        onChange={(e) => setCustomTrafficGb(parseInt(e.target.value))}
                        className="flex-1 accent-accent-500"
                      />
                      <div className="flex items-center gap-2">
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
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">
                        {customTrafficGb} {t('common.units.gb')} ×{' '}
                        {formatPrice(tariff.traffic_price_per_gb_kopeks ?? 0)}/
                        {t('common.units.gb')}
                      </span>
                      <span className="font-medium text-accent-400">
                        +{formatPrice(customTrafficGb * (tariff.traffic_price_per_gb_kopeks ?? 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary & Purchase */}
          {(selectedTariffPeriod || useCustomDays) && (
            <div className="rounded-xl bg-dark-800/50 p-5">
              {(() => {
                const basePeriodPrice = useCustomDays
                  ? customDays * (tariff.price_per_day_kopeks ?? 0)
                  : selectedTariffPeriod?.price_kopeks || 0;
                const existingPeriodOriginal = useCustomDays
                  ? tariff.original_price_per_day_kopeks &&
                    tariff.original_price_per_day_kopeks > (tariff.price_per_day_kopeks ?? 0)
                    ? customDays * tariff.original_price_per_day_kopeks
                    : undefined
                  : selectedTariffPeriod?.original_price_kopeks &&
                      selectedTariffPeriod.original_price_kopeks > selectedTariffPeriod.price_kopeks
                    ? selectedTariffPeriod.original_price_kopeks
                    : undefined;
                const promoPeriod = applyPromoDiscount(basePeriodPrice, existingPeriodOriginal);

                const trafficPrice =
                  useCustomTraffic && tariff.custom_traffic_enabled
                    ? customTrafficGb * (tariff.traffic_price_per_gb_kopeks ?? 0)
                    : 0;

                const totalPrice = promoPeriod.price + trafficPrice;
                const originalTotal = promoPeriod.original
                  ? promoPeriod.original + trafficPrice
                  : null;

                return (
                  <>
                    <div className="mb-4 space-y-2">
                      {useCustomDays ? (
                        <div className="flex justify-between text-sm text-dark-300">
                          <span>
                            {t('subscription.stepPeriod')}:{' '}
                            {t('subscription.days', { count: customDays })}
                          </span>
                          <div className="flex items-center gap-2">
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
                                <div className="flex justify-between text-sm text-dark-300">
                                  <span>
                                    {t('subscription.baseTariff')}: {selectedTariffPeriod.label}
                                  </span>
                                  <span>
                                    {formatPrice(selectedTariffPeriod.base_tariff_price_kopeks)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm text-dark-300">
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
                              <div className="flex justify-between text-sm text-dark-300">
                                <span>
                                  {t('subscription.summary.period', {
                                    label: selectedTariffPeriod.label,
                                  })}
                                </span>
                                <div className="flex items-center gap-2">
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
                        <div className="flex justify-between text-sm text-dark-300">
                          <span>{t('subscription.summary.traffic', { gb: customTrafficGb })}</span>
                          <span>+{formatPrice(trafficPrice)}</span>
                        </div>
                      )}
                    </div>

                    {promoPeriod.percent && (
                      <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 p-2">
                        <span className="text-sm font-medium text-warning-400">
                          {t('promo.discountApplied')} -{promoPeriod.percent}%
                        </span>
                      </div>
                    )}

                    <div className="mb-4 flex items-center justify-between border-t border-dark-700/50 pt-2">
                      <span className="font-medium text-dark-100">{t('subscription.total')}</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-accent-400">
                          {formatPrice(totalPrice)}
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
                      disabled={purchaseMutation.isPending}
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
