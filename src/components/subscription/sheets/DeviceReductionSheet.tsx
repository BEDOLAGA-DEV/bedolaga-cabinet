import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../../../api/subscription';
import { getErrorMessage } from '../../../utils/subscriptionHelpers';
import { ChevronRightIcon } from '../../icons';

// ──────────────────────────────────────────────────────────────────
// Reduce-devices sheet. Self-owns the reduction-info query + mutation;
// parent passes shared state (target limit + setter + ids + open flag).
//
// Extracted from Subscription.tsx to keep one cohesive feature in
// one file (~170 lines off the god page).
// ──────────────────────────────────────────────────────────────────

export interface DeviceReductionSheetProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  subscriptionPresent: boolean;
  subscriptionId: number | undefined;
  targetDeviceLimit: number;
  onTargetDeviceLimitChange: (n: number) => void;
  isDark: boolean;
}

export function DeviceReductionSheet({
  open,
  onOpen,
  onClose,
  subscriptionPresent,
  subscriptionId,
  targetDeviceLimit,
  onTargetDeviceLimitChange,
  isDark,
}: DeviceReductionSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: deviceReductionInfo } = useQuery({
    queryKey: ['device-reduction-info', subscriptionId],
    queryFn: () => subscriptionApi.getDeviceReductionInfo(subscriptionId),
    enabled: open && subscriptionPresent,
  });

  // Seed the target limit once the info comes back.
  useEffect(() => {
    if (deviceReductionInfo && open) {
      onTargetDeviceLimitChange(
        Math.max(
          deviceReductionInfo.min_device_limit,
          deviceReductionInfo.current_device_limit - 1,
        ),
      );
    }
    // onTargetDeviceLimitChange is a setter from the parent and stable
    // enough; intentionally narrow deps to avoid clobbering user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceReductionInfo, open]);

  const reduceMutation = useMutation({
    mutationFn: () => subscriptionApi.reduceDevices(targetDeviceLimit, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['device-reduction-info', subscriptionId] });
      onClose();
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
              {t('subscription.additionalOptions.reduceDevices')}
            </div>
            <div className="mt-1 text-sm text-dark-400">
              {t('subscription.additionalOptions.reduceDevicesDescription')}
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
        <h3 className="font-medium text-dark-100">
          {t('subscription.additionalOptions.reduceDevicesTitle')}
        </h3>
        <button
          onClick={onClose}
          className="text-sm text-dark-400 hover:text-dark-200"
          aria-label={t('common.close', 'Close')}
        >
          ✕
        </button>
      </div>

      {deviceReductionInfo?.available === false ? (
        <div className="py-4 text-center text-sm text-dark-400">
          {deviceReductionInfo.reason || t('subscription.additionalOptions.reduceUnavailable')}
        </div>
      ) : deviceReductionInfo ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() =>
                onTargetDeviceLimitChange(
                  Math.max(
                    Math.max(
                      deviceReductionInfo.min_device_limit,
                      deviceReductionInfo.connected_devices_count,
                    ),
                    targetDeviceLimit - 1,
                  ),
                )
              }
              disabled={
                targetDeviceLimit <=
                Math.max(
                  deviceReductionInfo.min_device_limit,
                  deviceReductionInfo.connected_devices_count,
                )
              }
              className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
              aria-label={t('subscription.additionalOptions.decrementDevices', 'Уменьшить')}
            >
              -
            </button>
            <div className="text-center">
              <div className="text-4xl font-bold text-dark-100">{targetDeviceLimit}</div>
              <div className="text-sm text-dark-500">
                {t('subscription.additionalOptions.devicesUnit')}
              </div>
            </div>
            <button
              onClick={() =>
                onTargetDeviceLimitChange(
                  Math.min(deviceReductionInfo.current_device_limit - 1, targetDeviceLimit + 1),
                )
              }
              disabled={targetDeviceLimit >= deviceReductionInfo.current_device_limit - 1}
              className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
              aria-label={t('subscription.additionalOptions.incrementDevices', 'Увеличить')}
            >
              +
            </button>
          </div>

          <div className="space-y-1 text-center text-sm text-dark-400">
            <div>
              {t('subscription.additionalOptions.currentDeviceLimit', {
                count: deviceReductionInfo.current_device_limit,
              })}
            </div>
            <div>
              {t('subscription.additionalOptions.minDeviceLimit', {
                count: deviceReductionInfo.min_device_limit,
              })}
            </div>
            <div>
              {t('subscription.additionalOptions.connectedDevices', {
                count: deviceReductionInfo.connected_devices_count,
              })}
            </div>
          </div>

          {deviceReductionInfo.connected_devices_count > deviceReductionInfo.min_device_limit && (
            <div className="rounded-lg bg-warning-500/10 p-3 text-center text-sm text-warning-400">
              {t('subscription.additionalOptions.disconnectDevicesFirst', {
                count: deviceReductionInfo.connected_devices_count,
              })}
            </div>
          )}

          <div className="text-center">
            <div className="text-sm text-dark-400">
              {t('subscription.additionalOptions.newDeviceLimit', {
                count: targetDeviceLimit,
              })}
            </div>
          </div>

          <button
            onClick={() => reduceMutation.mutate()}
            disabled={
              reduceMutation.isPending ||
              targetDeviceLimit >= deviceReductionInfo.current_device_limit ||
              targetDeviceLimit < deviceReductionInfo.min_device_limit ||
              targetDeviceLimit < deviceReductionInfo.connected_devices_count
            }
            className="btn-primary w-full py-3"
          >
            {reduceMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('subscription.additionalOptions.reducing')}
              </span>
            ) : (
              t('subscription.additionalOptions.reduce')
            )}
          </button>

          {reduceMutation.isError && (
            <div className="text-center text-sm text-error-400">
              {getErrorMessage(reduceMutation.error)}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-4">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-400/30 border-t-accent-400" />
        </div>
      )}
    </div>
  );
}
