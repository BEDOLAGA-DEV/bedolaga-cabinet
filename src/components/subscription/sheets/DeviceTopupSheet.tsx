import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../../../api/subscription';
import { getErrorMessage } from '../../../utils/subscriptionHelpers';
import InsufficientBalancePrompt from '../../InsufficientBalancePrompt';
import { ChevronRightIcon } from '../../icons';
import type { PurchaseOptions, Subscription } from '../../../types';

// ──────────────────────────────────────────────────────────────────
// Buy-devices sheet. Self-owns its devicePrice query + purchase mutation;
// parent only passes the subscription / id / open state and the shared
// purchaseOptions (which it already holds for sibling sheets and balance
// gating).
//
// Extracted from Subscription.tsx to drop ~190 lines from the god page.
// ──────────────────────────────────────────────────────────────────

export interface DeviceTopupSheetProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  subscription: Subscription;
  subscriptionId: number | undefined;
  devicesToAdd: number;
  onDevicesToAddChange: (n: number) => void;
  purchaseOptions: PurchaseOptions | undefined;
  isDark: boolean;
}

export function DeviceTopupSheet({
  open,
  onOpen,
  onClose,
  subscription,
  subscriptionId,
  devicesToAdd,
  onDevicesToAddChange,
  purchaseOptions,
  isDark,
}: DeviceTopupSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const formatPrice = (kopeks: number) => {
    const rubles = kopeks / 100;
    return rubles % 1 === 0 ? `${rubles} ₽` : `${rubles.toFixed(2)} ₽`;
  };

  const { data: devicePriceData } = useQuery({
    queryKey: ['device-price', devicesToAdd, subscriptionId],
    queryFn: () => subscriptionApi.getDevicePrice(devicesToAdd, subscriptionId),
    enabled: open && !!subscription,
  });

  const devicePurchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.purchaseDevices(devicesToAdd, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['device-price'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      onClose();
      onDevicesToAddChange(1);
    },
  });

  if (!open) {
    return (
      <button
        onClick={onOpen}
        className={`w-full rounded-xl border p-4 text-left transition-colors ${isDark ? 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600' : 'border-champagne-300/60 bg-champagne-200/40 hover:border-champagne-400'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-dark-100">
              {t('subscription.additionalOptions.buyDevices')}
            </div>
            <div className="mt-1 text-sm text-dark-400">
              {t('subscription.additionalOptions.currentDeviceLimit', {
                count: subscription.device_limit,
              })}
            </div>
          </div>
          <ChevronRightIcon className="text-dark-400" />
        </div>
      </button>
    );
  }

  return (
    <div
      className={`rounded-xl border p-5 ${isDark ? 'border-dark-700/50 bg-dark-800/50' : 'border-champagne-300/60 bg-champagne-200/40'}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-dark-100">{t('subscription.buyDevices')}</h3>
        <button
          onClick={onClose}
          className="text-sm text-dark-400 hover:text-dark-200"
          aria-label={t('common.close', 'Close')}
        >
          ✕
        </button>
      </div>

      {devicePriceData?.available === false ? (
        <div className="py-4 text-center text-sm text-dark-400">
          {devicePriceData.reason || t('subscription.additionalOptions.devicesUnavailable')}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Device counter */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => onDevicesToAddChange(Math.max(1, devicesToAdd - 1))}
              disabled={devicesToAdd <= 1}
              className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
              aria-label={t('subscription.additionalOptions.decrementDevices', 'Уменьшить')}
            >
              -
            </button>
            <div className="text-center">
              <div className="text-4xl font-bold text-dark-100">{devicesToAdd}</div>
              <div className="text-sm text-dark-500">
                {t('subscription.additionalOptions.devicesUnit')}
              </div>
            </div>
            <button
              onClick={() => onDevicesToAddChange(devicesToAdd + 1)}
              disabled={
                devicePriceData?.max_device_limit
                  ? (devicePriceData.current_device_limit || 0) + devicesToAdd >=
                    devicePriceData.max_device_limit
                  : false
              }
              className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
              aria-label={t('subscription.additionalOptions.incrementDevices', 'Увеличить')}
            >
              +
            </button>
          </div>

          {devicePriceData?.max_device_limit && (
            <div className="text-center text-sm text-dark-400">
              {t('subscription.additionalOptions.currentDeviceLimit', {
                count: devicePriceData.current_device_limit || subscription.device_limit,
              })}{' '}
              /{' '}
              {t('subscription.additionalOptions.maxDevices', {
                count: devicePriceData.max_device_limit,
              })}
            </div>
          )}

          {/* Price info */}
          {devicePriceData?.available && devicePriceData.price_per_device_label && (
            <div className="text-center">
              <div className="mb-2 text-sm text-dark-400">
                {devicePriceData.discount_percent &&
                devicePriceData.discount_percent > 0 &&
                devicePriceData.original_price_per_device_kopeks ? (
                  <span>
                    <span className="text-dark-500 line-through">
                      {formatPrice(devicePriceData.original_price_per_device_kopeks)}
                    </span>
                    <span className="mx-1">{devicePriceData.price_per_device_label}</span>
                  </span>
                ) : (
                  devicePriceData.price_per_device_label
                )}
                /{t('subscription.perDevice').replace('/ ', '')} (
                {t('subscription.days', { count: devicePriceData.days_left })})
              </div>
              {devicePriceData.discount_percent && devicePriceData.discount_percent > 0 && (
                <div className="mb-2">
                  <span className="inline-block rounded-full bg-success-500/20 px-2.5 py-0.5 text-sm font-medium text-success-400">
                    -{devicePriceData.discount_percent}%
                  </span>
                </div>
              )}
              {devicePriceData.total_price_kopeks === 0 ? (
                <div className="text-2xl font-bold text-success-400">
                  {t('subscription.switchTariff.free')}
                </div>
              ) : (
                <div className="text-2xl font-bold text-accent-400">
                  {devicePriceData.discount_percent &&
                    devicePriceData.discount_percent > 0 &&
                    devicePriceData.base_total_price_kopeks && (
                      <span className="mr-2 text-lg text-dark-500 line-through">
                        {formatPrice(devicePriceData.base_total_price_kopeks)}
                      </span>
                    )}
                  {devicePriceData.total_price_label}
                </div>
              )}
            </div>
          )}

          {/* Insufficient balance */}
          {devicePriceData?.available &&
            purchaseOptions &&
            devicePriceData.total_price_kopeks &&
            devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks && (
              <InsufficientBalancePrompt
                missingAmountKopeks={
                  devicePriceData.total_price_kopeks - purchaseOptions.balance_kopeks
                }
                compact
                onBeforeTopUp={async () => {
                  await subscriptionApi.saveDevicesCart(devicesToAdd, subscriptionId);
                }}
              />
            )}

          <button
            onClick={() => devicePurchaseMutation.mutate()}
            disabled={
              devicePurchaseMutation.isPending ||
              !devicePriceData?.available ||
              !!(
                devicePriceData?.total_price_kopeks &&
                purchaseOptions &&
                devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks
              )
            }
            className="btn-primary w-full py-3"
          >
            {devicePurchaseMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
            ) : (
              t('subscription.additionalOptions.buy')
            )}
          </button>

          {devicePurchaseMutation.isError && (
            <div className="text-center text-sm text-error-400">
              {getErrorMessage(devicePurchaseMutation.error)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
