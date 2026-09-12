import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '../../../api/subscription';
import type { PremiumTrafficOptions, PurchaseOptions } from '../../../types';
import { getErrorMessage } from '../../../utils/subscriptionHelpers';
import { ChevronRightIcon } from '../../icons';
import InsufficientBalancePrompt from '../../InsufficientBalancePrompt';

// ──────────────────────────────────────────────────────────────────
// Докупка премиум-трафика — серверов с отдельным лимитом внутри тарифа.
//
// Отдельно от обычной докупки: цены и пакеты у каждого такого сервера свои,
// заданные в тарифе, и лимит независимый. Купленное действует до конца
// текущего периода, дальше сбрасывается вместе с расходом.
//
// Блок не показывается вовсе, когда докупать нечего: бэкенд отдаёт пустой
// список, если премиум-серверов в тарифе нет или докупка по ним выключена.
// ──────────────────────────────────────────────────────────────────

export interface PremiumTrafficTopupSheetProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  subscriptionId: number | undefined;
  purchaseOptions: PurchaseOptions | undefined;
  isDark: boolean;
}

export function PremiumTrafficTopupSheet({
  open,
  onOpen,
  onClose,
  subscriptionId,
  purchaseOptions,
  isDark,
}: PremiumTrafficTopupSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<{ squad: string; gb: number } | null>(null);

  const formatPrice = (kopeks: number) => {
    const rubles = kopeks / 100;
    return rubles % 1 === 0 ? `${rubles} ₽` : `${rubles.toFixed(2)} ₽`;
  };

  const { data: options } = useQuery({
    queryKey: ['premium-traffic-options', subscriptionId],
    queryFn: () => subscriptionApi.getPremiumTrafficOptions(subscriptionId),
    // Спрашиваем и в свёрнутом виде: от ответа зависит, показывать ли кнопку.
    enabled: true,
  });

  const purchaseMutation = useMutation({
    mutationFn: ({ squad, gb }: { squad: string; gb: number }) =>
      subscriptionApi.purchasePremiumTraffic(squad, gb, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['premium-traffic-options', subscriptionId] });
      onClose();
      setSelected(null);
    },
  });

  const available = (options ?? []).filter((item) => item.packages.length > 0);
  if (available.length === 0) return null;

  if (!open) {
    const limited = available.filter((item) => item.is_limited).length;
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`w-full rounded-xl border p-4 text-left transition-colors ${isDark ? 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600' : 'border-champagne-300/60 bg-champagne-200/40 hover:border-champagne-400'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-dark-100">
              {t('subscription.additionalOptions.buyPremiumTraffic')}
            </div>
            <div className="mt-1 text-sm text-dark-400">
              {limited > 0
                ? // Исчерпанный лимит — главная причина сюда зайти, поэтому о нём
                  // говорим прямо в свёрнутой кнопке.
                  t('subscription.additionalOptions.premiumTrafficExhausted')
                : t('subscription.additionalOptions.premiumTrafficHint')}
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
          {t('subscription.additionalOptions.buyPremiumTrafficTitle')}
        </h3>
        <button
          type="button"
          onClick={() => {
            onClose();
            setSelected(null);
          }}
          className="text-sm text-dark-400 hover:text-dark-200"
          aria-label={t('common.close', 'Close')}
        >
          ✕
        </button>
      </div>

      <div className="space-y-5">
        {available.map((item) => (
          <PremiumSquadPackages
            key={item.squad_uuid}
            item={item}
            isDark={isDark}
            selected={selected}
            onSelect={setSelected}
            formatPrice={formatPrice}
          />
        ))}

        {selected !== null &&
          (() => {
            const squad = available.find((item) => item.squad_uuid === selected.squad);
            const pkg = squad?.packages.find((p) => p.gb === selected.gb);
            const enough =
              !pkg || !purchaseOptions || pkg.price_kopeks <= purchaseOptions.balance_kopeks;
            const missing =
              pkg && purchaseOptions ? pkg.price_kopeks - purchaseOptions.balance_kopeks : 0;

            return (
              <>
                {!enough && missing > 0 && (
                  <InsufficientBalancePrompt
                    missingAmountKopeks={missing}
                    compact
                    className="mb-3"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    purchaseMutation.mutate({ squad: selected.squad, gb: selected.gb })
                  }
                  disabled={purchaseMutation.isPending || !enough}
                  className="btn-primary w-full py-3"
                >
                  {purchaseMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </span>
                  ) : (
                    t('subscription.additionalOptions.buyTrafficGb', { gb: selected.gb })
                  )}
                </button>
              </>
            );
          })()}

        {purchaseMutation.isError && (
          <div className="text-center text-sm text-error-400">
            {getErrorMessage(purchaseMutation.error)}
          </div>
        )}
      </div>
    </div>
  );
}

function PremiumSquadPackages({
  item,
  isDark,
  selected,
  onSelect,
  formatPrice,
}: {
  item: PremiumTrafficOptions;
  isDark: boolean;
  selected: { squad: string; gb: number } | null;
  onSelect: (value: { squad: string; gb: number }) => void;
  formatPrice: (kopeks: number) => string;
}) {
  const { t } = useTranslation();
  const total = item.limit_gb + item.extra_gb;
  // Потолок докупки считается от уже купленного за период, а не от нуля:
  // иначе его можно было бы обойти покупками по одному гигабайту.
  const remainingTopup = item.max_topup_gb > 0 ? item.max_topup_gb - item.extra_gb : null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium text-dark-100">
          {item.name || t('dashboard.premiumTraffic')}
        </span>
        <span className="shrink-0 font-mono text-xs text-dark-400">
          {item.used_gb.toFixed(1)} / {total.toFixed(1)} {t('common.units.gb')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {item.packages.map((pkg) => {
          const overCap = remainingTopup !== null && pkg.gb > remainingTopup;
          const isSelected = selected?.squad === item.squad_uuid && selected.gb === pkg.gb;
          return (
            <button
              key={pkg.gb}
              type="button"
              disabled={overCap}
              onClick={() => onSelect({ squad: item.squad_uuid, gb: pkg.gb })}
              className={`rounded-xl border p-4 text-center transition-all ${
                overCap
                  ? 'cursor-not-allowed border-dark-700/30 opacity-40'
                  : isSelected
                    ? 'border-accent-500 bg-accent-500/10'
                    : isDark
                      ? 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
                      : 'border-champagne-300/60 bg-champagne-200/40 hover:border-champagne-400'
              }`}
            >
              <div className="text-lg font-semibold text-dark-100">
                {pkg.gb} {t('common.units.gb')}
              </div>
              <div className="font-medium text-accent-400">{formatPrice(pkg.price_kopeks)}</div>
            </button>
          );
        })}
      </div>

      {remainingTopup !== null && remainingTopup <= 0 && (
        <div className="mt-2 text-xs text-dark-400">
          {t('subscription.additionalOptions.premiumTopupCapReached', { cap: item.max_topup_gb })}
        </div>
      )}
    </div>
  );
}
