import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../../../api/subscription';
import { getErrorMessage, getFlagEmoji } from '../../../utils/subscriptionHelpers';
import InsufficientBalancePrompt from '../../InsufficientBalancePrompt';
import { ChevronRightIcon } from '../../icons';
import type { PurchaseOptions, Subscription } from '../../../types';

// ──────────────────────────────────────────────────────────────────
// Manage-servers sheet (classic-mode only — caller decides whether to
// render). Self-owns the countries query + update mutation; parent
// holds the selected-uuid set so the global "close all modals" can
// reset it.
//
// Extracted from Subscription.tsx — ~280 lines off the god page.
// ──────────────────────────────────────────────────────────────────

export interface ServerManagementSheetProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  subscription: Subscription;
  subscriptionId: number | undefined;
  selectedServers: string[];
  onSelectedServersChange: (uuids: string[] | ((prev: string[]) => string[])) => void;
  purchaseOptions: PurchaseOptions | undefined;
  isDark: boolean;
}

export function ServerManagementSheet({
  open,
  onOpen,
  onClose,
  subscription,
  subscriptionId,
  selectedServers,
  onSelectedServersChange,
  purchaseOptions,
  isDark,
}: ServerManagementSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const formatPrice = (kopeks: number) => {
    const rubles = kopeks / 100;
    return rubles % 1 === 0 ? `${rubles} ₽` : `${rubles.toFixed(2)} ₽`;
  };

  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries', subscriptionId],
    queryFn: () => subscriptionApi.getCountries(subscriptionId),
    enabled: open && !!subscription && !subscription.is_trial,
  });

  // Seed selected = currently connected once the data loads.
  useEffect(() => {
    if (countriesData && open) {
      const connected = countriesData.countries.filter((c) => c.is_connected).map((c) => c.uuid);
      onSelectedServersChange(connected);
    }
    // Intentionally narrow — the setter is stable and we don't want to
    // re-seed every time the user toggles a server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countriesData, open]);

  const updateMutation = useMutation({
    mutationFn: (countries: string[]) => subscriptionApi.updateCountries(countries, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['countries', subscriptionId] });
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
              {t('subscription.additionalOptions.manageServers')}
            </div>
            <div className="mt-1 text-sm text-dark-400">
              {t('subscription.servers', { count: subscription.servers?.length || 0 })}
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
          {t('subscription.additionalOptions.manageServersTitle')}
        </h3>
        <button
          onClick={() => {
            onClose();
            onSelectedServersChange([]);
          }}
          className="text-sm text-dark-400 hover:text-dark-200"
          aria-label={t('common.close', 'Close')}
        >
          ✕
        </button>
      </div>

      {countriesLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : countriesData && countriesData.countries.length > 0 ? (
        <div className="space-y-4">
          <div
            className={`rounded-lg p-2 text-xs ${isDark ? 'bg-dark-700/30 text-dark-500' : 'bg-champagne-300/40 text-champagne-600'}`}
          >
            {t('subscription.serverManagement.statusLegend')}
          </div>

          {countriesData.discount_percent > 0 && (
            <div className="rounded-lg border border-success-500/30 bg-success-500/10 p-2 text-xs text-success-400">
              🎁{' '}
              {t('subscription.serverManagement.discountBanner', {
                percent: countriesData.discount_percent,
              })}
            </div>
          )}

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {countriesData.countries
              .filter((country) => country.is_available || country.is_connected)
              .map((country) => {
                const isCurrentlyConnected = country.is_connected;
                const isSelected = selectedServers.includes(country.uuid);
                const willBeAdded = !isCurrentlyConnected && isSelected;
                const willBeRemoved = isCurrentlyConnected && !isSelected;

                return (
                  <button
                    key={country.uuid}
                    onClick={() => {
                      if (isSelected) {
                        onSelectedServersChange((prev) => prev.filter((u) => u !== country.uuid));
                      } else {
                        onSelectedServersChange((prev) => [...prev, country.uuid]);
                      }
                    }}
                    disabled={!country.is_available && !isCurrentlyConnected}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? willBeAdded
                          ? 'border-success-500 bg-success-500/10'
                          : 'border-accent-500 bg-accent-500/10'
                        : willBeRemoved
                          ? 'border-error-500/50 bg-error-500/5'
                          : isDark
                            ? 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
                            : 'border-champagne-300/60 bg-champagne-200/40 hover:border-champagne-400'
                    } ${!country.is_available && !isCurrentlyConnected ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 text-lg">
                        {willBeAdded ? '➕' : willBeRemoved ? '➖' : isSelected ? '✅' : '⚪'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2 font-medium text-dark-100">
                          <span className="truncate">{country.name}</span>
                          {country.has_discount && !isCurrentlyConnected && (
                            <span className="shrink-0 rounded bg-success-500/20 px-1.5 py-0.5 text-xs text-success-400">
                              -{country.discount_percent}%
                            </span>
                          )}
                        </div>
                        {willBeAdded && (
                          <div className="text-xs text-success-400">
                            +{formatPrice(country.price_kopeks)}{' '}
                            {t('subscription.serverManagement.forDays', {
                              days: countriesData.days_left,
                            })}
                            {country.has_discount && (
                              <span className="ml-1 text-dark-500 line-through">
                                {formatPrice(
                                  Math.round(
                                    (country.base_price_kopeks * countriesData.days_left) / 30,
                                  ),
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        {!willBeAdded && !isCurrentlyConnected && (
                          <div className="text-xs text-dark-500">
                            {formatPrice(country.price_per_month_kopeks)}
                            {t('subscription.serverManagement.perMonth')}
                            {country.has_discount && (
                              <span className="ml-1 text-dark-600 line-through">
                                {formatPrice(country.base_price_kopeks)}
                              </span>
                            )}
                          </div>
                        )}
                        {!country.is_available && !isCurrentlyConnected && (
                          <div className="text-xs text-dark-500">
                            {t('subscription.serverManagement.unavailable')}
                          </div>
                        )}
                      </div>
                    </div>
                    {country.country_code && (
                      <span className="shrink-0 text-xl">{getFlagEmoji(country.country_code)}</span>
                    )}
                  </button>
                );
              })}
          </div>

          {(() => {
            const currentConnected = countriesData.countries
              .filter((c) => c.is_connected)
              .map((c) => c.uuid);
            const added = selectedServers.filter((u) => !currentConnected.includes(u));
            const removed = currentConnected.filter((u) => !selectedServers.includes(u));
            const hasChanges = added.length > 0 || removed.length > 0;

            const addedServers = countriesData.countries.filter((c) => added.includes(c.uuid));
            const totalCost = addedServers.reduce((sum, s) => sum + s.price_kopeks, 0);
            const hasEnoughBalance =
              !purchaseOptions || totalCost <= purchaseOptions.balance_kopeks;
            const missingAmount = purchaseOptions ? totalCost - purchaseOptions.balance_kopeks : 0;

            return hasChanges ? (
              <div
                className={`space-y-3 border-t pt-3 ${isDark ? 'border-dark-700/50' : 'border-champagne-300/60'}`}
              >
                {added.length > 0 && (
                  <div className="text-sm">
                    <span className="text-success-400">
                      {t('subscription.serverManagement.toAdd')}
                    </span>{' '}
                    <span className="text-dark-300">
                      {addedServers.map((s) => s.name).join(', ')}
                    </span>
                  </div>
                )}
                {removed.length > 0 && (
                  <div className="text-sm">
                    <span className="text-error-400">
                      {t('subscription.serverManagement.toDisconnect')}
                    </span>{' '}
                    <span className="text-dark-300">
                      {countriesData.countries
                        .filter((c) => removed.includes(c.uuid))
                        .map((s) => s.name)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {totalCost > 0 && (
                  <div className="text-center">
                    <div className="text-sm text-dark-400">
                      {t('subscription.serverManagement.paymentProrated')}
                    </div>
                    <div className="text-xl font-bold text-accent-400">
                      {formatPrice(totalCost)}
                    </div>
                  </div>
                )}

                {totalCost > 0 && !hasEnoughBalance && missingAmount > 0 && (
                  <InsufficientBalancePrompt missingAmountKopeks={missingAmount} compact />
                )}

                <button
                  onClick={() => updateMutation.mutate(selectedServers)}
                  disabled={
                    updateMutation.isPending ||
                    selectedServers.length === 0 ||
                    (totalCost > 0 && !hasEnoughBalance)
                  }
                  className="btn-primary w-full py-3"
                >
                  {updateMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </span>
                  ) : (
                    t('subscription.serverManagement.applyChanges')
                  )}
                </button>
              </div>
            ) : (
              <div className="py-2 text-center text-sm text-dark-500">
                {t('subscription.serverManagement.selectServersHint')}
              </div>
            );
          })()}

          {updateMutation.isError && (
            <div className="text-center text-sm text-error-400">
              {getErrorMessage(updateMutation.error)}
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center text-sm text-dark-400">
          {t('subscription.serverManagement.noServersAvailable')}
        </div>
      )}
    </div>
  );
}
