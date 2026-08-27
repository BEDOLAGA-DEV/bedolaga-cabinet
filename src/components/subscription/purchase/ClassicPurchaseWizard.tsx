import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../../../api/subscription';
import { useTheme } from '../../../hooks/useTheme';
import { useCurrency } from '../../../hooks/useCurrency';
import { usePromoDiscount } from '../../../hooks/usePromoDiscount';
import { useCloseOnSuccessNotification } from '../../../store/successNotification';
import { getGlassColors } from '../../../utils/glassTheme';
import { getErrorMessage, type PurchaseStep } from '../../../utils/subscriptionHelpers';
import { CheckIcon } from '../../icons';
import InsufficientBalancePrompt from '../../InsufficientBalancePrompt';
import Twemoji from 'react-twemoji';
import type {
  ClassicPurchaseOptions,
  PeriodOption,
  PurchaseSelection,
  Subscription,
} from '../../../types';

// ──────────────────────────────────────────────────────────────────
// ClassicPurchaseWizard
//
// The classic-mode (non-tariff) purchase flow: a step wizard with
// period → traffic (optional) → servers (when >1) → devices
// (optional) → confirm. Self-owns:
//   - the preview query (gated to confirm step)
//   - the submitPurchase mutation
//   - all six pieces of wizard state (currentStep, selectedPeriod,
//     selectedTraffic, selectedServers, selectedDevices, showForm)
//   - the steps memo + currentSelection memo
//   - the init effect that seeds defaults from classicOptions.selection
//   - useCloseOnSuccessNotification (resets form + step on global
//     success notification)
//
// Parent only supplies the loaded options and the subscription
// context. Replaces ~411 lines of inline JSX in SubscriptionPurchase.
// ──────────────────────────────────────────────────────────────────

export interface ClassicPurchaseWizardProps {
  classicOptions: ClassicPurchaseOptions;
  subscription: Subscription | null;
  subscriptionId: number | undefined;
}

export function ClassicPurchaseWizard({
  classicOptions,
  subscription,
  subscriptionId,
}: ClassicPurchaseWizardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const { formatAmount, currencySymbol } = useCurrency();
  const { activeDiscount, applyPromoDiscount } = usePromoDiscount();

  const formatPrice = (kopeks: number) =>
    kopeks === 0
      ? t('subscription.free', 'Бесплатно')
      : `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  // Wizard state
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('period');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption | null>(null);
  const [selectedTraffic, setSelectedTraffic] = useState<number | null>(null);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<number>(1);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  // Global success-notification handler — resets back to the closed,
  // period-step state. Mirrors the parent's old handleCloseAllModals
  // contract for this flow.
  useCloseOnSuccessNotification(() => {
    setShowPurchaseForm(false);
    setCurrentStep('period');
  });

  const getAvailableServers = useCallback(
    (period: PeriodOption | null) => {
      if (!period?.servers.options) return [];
      return period.servers.options.filter((server) => {
        if (!server.is_available) return false;
        if (subscription?.is_trial && server.name.toLowerCase().includes('trial')) return false;
        return true;
      });
    },
    [subscription?.is_trial],
  );

  const steps = useMemo<PurchaseStep[]>(() => {
    const result: PurchaseStep[] = ['period'];
    if (selectedPeriod?.traffic.selectable && (selectedPeriod.traffic.options?.length ?? 0) > 0) {
      result.push('traffic');
    }
    const availableServers = getAvailableServers(selectedPeriod);
    if (availableServers.length > 1) {
      result.push('servers');
    }
    if (selectedPeriod && selectedPeriod.devices.max > selectedPeriod.devices.min) {
      result.push('devices');
    }
    result.push('confirm');
    return result;
  }, [selectedPeriod, getAvailableServers]);

  const currentStepIndex = steps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Seed defaults from classicOptions.selection on first mount.
  useEffect(() => {
    if (!selectedPeriod) {
      const defaultPeriod =
        classicOptions.periods.find((p) => p.id === classicOptions.selection.period_id) ||
        classicOptions.periods[0];
      setSelectedPeriod(defaultPeriod);
      setSelectedTraffic(classicOptions.selection.traffic_value);
      const availableServers = getAvailableServers(defaultPeriod);
      const availableServerUuids = new Set(availableServers.map((s) => s.uuid));
      if (availableServers.length === 1) {
        setSelectedServers([availableServers[0].uuid]);
      } else {
        setSelectedServers(
          classicOptions.selection.servers.filter((uuid) => availableServerUuids.has(uuid)),
        );
      }
      setSelectedDevices(classicOptions.selection.devices);
    }
  }, [classicOptions, selectedPeriod, getAvailableServers]);

  const currentSelection: PurchaseSelection = useMemo(
    () => ({
      period_id: selectedPeriod?.id,
      period_days: selectedPeriod?.period_days,
      traffic_value: selectedTraffic ?? undefined,
      servers: selectedServers,
      devices: selectedDevices,
    }),
    [selectedPeriod, selectedTraffic, selectedServers, selectedDevices],
  );

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['purchase-preview', currentSelection],
    queryFn: () => subscriptionApi.previewPurchase(currentSelection, subscriptionId),
    enabled: !!selectedPeriod && showPurchaseForm && currentStep === 'confirm',
  });

  const purchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.submitPurchase(currentSelection, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      navigate('/subscriptions', { replace: true });
    },
  });

  const toggleServer = (uuid: string) => {
    if (selectedServers.includes(uuid)) {
      if (selectedServers.length > 1) {
        setSelectedServers(selectedServers.filter((s) => s !== uuid));
      }
    } else {
      setSelectedServers([...selectedServers, uuid]);
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const resetPurchase = () => {
    setShowPurchaseForm(false);
    setCurrentStep('period');
  };

  const getStepLabel = (step: PurchaseStep) => {
    switch (step) {
      case 'period':
        return t('subscription.stepPeriod');
      case 'traffic':
        return t('subscription.stepTraffic');
      case 'servers':
        return t('subscription.stepServers');
      case 'devices':
        return t('subscription.stepDevices');
      case 'confirm':
        return t('subscription.stepConfirm');
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: g.cardBg,
        border: `1px solid ${g.cardBorder}`,
        boxShadow: g.shadow,
        padding: '24px 28px',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight text-dark-50">
          {subscription && !subscription.is_trial
            ? t('subscription.extend')
            : t('subscription.getSubscription')}
        </h2>
        {!showPurchaseForm && (
          <button onClick={() => setShowPurchaseForm(true)} className="btn-primary">
            {subscription && !subscription.is_trial
              ? t('subscription.extend')
              : t('subscription.getSubscription')}
          </button>
        )}
      </div>

      {showPurchaseForm && (
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="mb-6 flex items-center justify-between">
            <div className="text-sm text-dark-400">
              {t('subscription.step', { current: currentStepIndex + 1, total: steps.length })}
            </div>
            <div className="flex gap-2">
              {steps.map((step, idx) => (
                <div
                  key={step}
                  className={`h-1 w-8 rounded-full transition-colors ${
                    idx <= currentStepIndex ? 'bg-accent-500' : 'bg-dark-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mb-4 text-lg font-medium text-dark-100">{getStepLabel(currentStep)}</div>

          {/* Step: Period Selection */}
          {currentStep === 'period' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {classicOptions.periods.map((period) => {
                const promoPeriod = applyPromoDiscount(
                  period.price_kopeks,
                  period.original_price_kopeks,
                );

                return (
                  <button
                    key={period.id}
                    onClick={() => {
                      setSelectedPeriod(period);
                      if (period.traffic.current !== undefined) {
                        setSelectedTraffic(period.traffic.current);
                      }
                      const availableServers = getAvailableServers(period);
                      if (availableServers.length === 1) {
                        setSelectedServers([availableServers[0].uuid]);
                      } else if (period.servers.selected) {
                        const availUuids = new Set(availableServers.map((s) => s.uuid));
                        setSelectedServers(
                          period.servers.selected.filter((uuid) => availUuids.has(uuid)),
                        );
                      }
                      if (period.devices.current) {
                        setSelectedDevices(period.devices.current);
                      }
                    }}
                    className={`bento-card-hover relative p-4 text-left transition-all ${
                      selectedPeriod?.id === period.id ? 'bento-card-glow border-accent-500' : ''
                    }`}
                  >
                    {promoPeriod.percent && promoPeriod.percent > 0 && (
                      <div
                        className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                          promoPeriod.isPromoGroup ? 'bg-success-500' : 'bg-warning-500'
                        }`}
                      >
                        -{promoPeriod.percent}%
                      </div>
                    )}
                    <div className="text-lg font-semibold text-dark-100">{period.label}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-accent-400">
                        {formatPrice(promoPeriod.price)}
                      </span>
                      {promoPeriod.original && promoPeriod.original > promoPeriod.price && (
                        <span className="text-sm text-dark-500 line-through">
                          {formatPrice(promoPeriod.original)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step: Traffic Selection */}
          {currentStep === 'traffic' && selectedPeriod?.traffic.options && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {selectedPeriod.traffic.options.map((option) => {
                const promoTraffic = applyPromoDiscount(
                  option.price_kopeks,
                  option.original_price_kopeks,
                );

                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedTraffic(option.value)}
                    disabled={!option.is_available}
                    className={`bento-card-hover relative p-4 text-center transition-all ${
                      selectedTraffic === option.value ? 'bento-card-glow border-accent-500' : ''
                    } ${!option.is_available ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {promoTraffic.percent && promoTraffic.percent > 0 && (
                      <div
                        className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                          promoTraffic.isPromoGroup ? 'bg-success-500' : 'bg-warning-500'
                        }`}
                      >
                        -{promoTraffic.percent}%
                      </div>
                    )}
                    <div className="text-lg font-semibold text-dark-100">{option.label}</div>
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                      <span className="text-accent-400">{formatPrice(promoTraffic.price)}</span>
                      {promoTraffic.original && promoTraffic.original > promoTraffic.price && (
                        <span className="text-xs text-dark-500 line-through">
                          {formatPrice(promoTraffic.original)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step: Server Selection */}
          {currentStep === 'servers' && selectedPeriod?.servers.options && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {selectedPeriod.servers.options
                .filter((server) => {
                  if (!server.is_available) return false;
                  if (subscription?.is_trial && server.name.toLowerCase().includes('trial')) {
                    return false;
                  }
                  return true;
                })
                .map((server) => {
                  const promoServer = applyPromoDiscount(
                    server.price_kopeks,
                    server.original_price_kopeks,
                  );

                  return (
                    <button
                      key={server.uuid}
                      onClick={() => toggleServer(server.uuid)}
                      disabled={!server.is_available}
                      className={`relative rounded-xl border p-4 text-left transition-all ${
                        selectedServers.includes(server.uuid)
                          ? 'border-accent-500 bg-accent-500/10'
                          : server.is_available
                            ? 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
                            : 'cursor-not-allowed border-dark-800/30 bg-dark-900/30 opacity-50'
                      }`}
                    >
                      {promoServer.percent && promoServer.percent > 0 ? (
                        <div
                          className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                            promoServer.isPromoGroup ? 'bg-success-500' : 'bg-warning-500'
                          }`}
                        >
                          -{promoServer.percent}%
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${
                            selectedServers.includes(server.uuid)
                              ? 'border-accent-500 bg-accent-500'
                              : 'border-dark-600'
                          }`}
                        >
                          {selectedServers.includes(server.uuid) && <CheckIcon />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-dark-100">
                            <Twemoji options={{ className: 'twemoji', folder: 'svg', ext: '.svg' }}>
                              {server.name}
                            </Twemoji>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm text-accent-400">
                              {formatPrice(promoServer.price)}
                              {t('subscription.perMonth')}
                            </span>
                            {promoServer.original && promoServer.original > promoServer.price ? (
                              <span className="text-xs text-dark-500 line-through">
                                {formatPrice(promoServer.original)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Step: Device Selection */}
          {currentStep === 'devices' && selectedPeriod && (
            <div className="flex flex-col items-center py-8">
              <div className="flex items-center gap-6">
                <button
                  onClick={() =>
                    setSelectedDevices(Math.max(selectedPeriod.devices.min, selectedDevices - 1))
                  }
                  disabled={selectedDevices <= selectedPeriod.devices.min}
                  className="btn-secondary flex h-14 w-14 items-center justify-center !p-0 text-2xl"
                >
                  -
                </button>
                <div className="text-center">
                  <div className="text-5xl font-bold text-dark-100">{selectedDevices}</div>
                  <div className="mt-2 text-dark-500">{t('subscription.devices')}</div>
                </div>
                <button
                  onClick={() =>
                    setSelectedDevices(Math.min(selectedPeriod.devices.max, selectedDevices + 1))
                  }
                  disabled={selectedDevices >= selectedPeriod.devices.max}
                  className="btn-secondary flex h-14 w-14 items-center justify-center !p-0 text-2xl"
                >
                  +
                </button>
              </div>
              <div className="mt-4 space-y-1 text-center text-sm text-dark-500">
                <div className="text-accent-400">
                  {t('subscription.devicesFree', { count: selectedPeriod.devices.min })}
                </div>
                {selectedPeriod.devices.max > selectedPeriod.devices.min && (
                  <div>
                    {formatPrice(selectedPeriod.devices.price_per_device_kopeks)}{' '}
                    {t('subscription.perExtraDevice')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {currentStep === 'confirm' && (
            <div>
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                </div>
              ) : preview ? (
                <div className="space-y-4 rounded-xl bg-dark-800/50 p-5">
                  {activeDiscount?.is_active && activeDiscount.discount_percent && (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 p-3">
                      <svg
                        className="h-4 w-4 text-warning-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-warning-400">
                        {t('promo.discountApplied')} -{activeDiscount.discount_percent}%
                      </span>
                    </div>
                  )}

                  {preview.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-dark-300">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                  ))}

                  {(() => {
                    const promoTotal = applyPromoDiscount(
                      preview.total_price_kopeks,
                      preview.original_price_kopeks,
                    );

                    return (
                      <div className="flex items-center justify-between border-t border-dark-700/50 pt-4">
                        <span className="text-lg font-semibold text-dark-100">
                          {t('subscription.total')}
                        </span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-accent-400">
                            {formatPrice(promoTotal.price)}
                          </div>
                          {promoTotal.original && promoTotal.original > promoTotal.price && (
                            <div className="text-sm text-dark-500 line-through">
                              {formatPrice(promoTotal.original)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {preview.discount_label && (
                    <div className="text-center text-sm text-success-400">
                      {preview.discount_label}
                    </div>
                  )}

                  {!preview.can_purchase &&
                    (preview.missing_amount_kopeks > 0 ? (
                      <InsufficientBalancePrompt
                        missingAmountKopeks={preview.missing_amount_kopeks}
                        compact
                      />
                    ) : preview.status_message ? (
                      <div className="rounded-lg bg-error-500/10 px-4 py-3 text-center text-sm text-error-400">
                        {preview.status_message}
                      </div>
                    ) : null)}
                </div>
              ) : null}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 border-t border-dark-800/50 pt-4">
            {!isFirstStep && (
              <button onClick={goToPrevStep} className="btn-secondary flex-1">
                {t('common.back')}
              </button>
            )}

            {isFirstStep && (
              <button onClick={resetPurchase} className="btn-secondary">
                {t('common.cancel')}
              </button>
            )}

            {!isLastStep ? (
              <button
                onClick={goToNextStep}
                disabled={!selectedPeriod}
                className="btn-primary flex-1"
              >
                {t('common.next')}
              </button>
            ) : (
              <button
                onClick={() => purchaseMutation.mutate()}
                disabled={purchaseMutation.isPending || previewLoading || !preview?.can_purchase}
                className="btn-primary flex-1"
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
            )}
          </div>

          {purchaseMutation.isError && (
            <div className="text-center text-sm text-error-400">
              {getErrorMessage(purchaseMutation.error)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
