import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useTheme } from '../../../hooks/useTheme';
import { useCurrency } from '../../../hooks/useCurrency';
import { usePromoDiscount } from '../../../hooks/usePromoDiscount';
import { getGlassColors } from '../../../utils/glassTheme';
import { ArrowDownIcon, DevicesIcon, RestartIcon } from '@/components/icons';
import type { Tariff, Subscription, PurchaseOptions } from '../../../types';

// ──────────────────────────────────────────────────────────────────
// TariffPickerGrid
//
// The tariff selection surface inside SubscriptionPurchase. Renders:
//   - an optional promo-group banner when any tariff carries a
//     promo_group_name
//   - the "all tariffs purchased" empty state (multi-tariff mode)
//   - the grid itself (1 col mobile, 2 cols sm+) with promo prices,
//     per-tariff CTAs differentiated by user state (extend / switch /
//     purchase / legacy renewal)
//
// Owns nothing — pure presentation that calls back into the parent
// for selection (`onSelectTariff`) and switch (`onSwitchTariff`).
// ──────────────────────────────────────────────────────────────────

export interface TariffPickerGridProps {
  tariffs: Tariff[];
  subscription: Subscription | null;
  purchaseOptions: PurchaseOptions | undefined;
  isTariffsMode: boolean;
  isMultiTariff: boolean;
  onSelectTariff: (tariff: Tariff) => void;
  onSwitchTariff: (tariffId: number) => void;
}

export function TariffPickerGrid({
  tariffs,
  subscription,
  purchaseOptions,
  isTariffsMode,
  isMultiTariff,
  onSelectTariff,
  onSwitchTariff,
}: TariffPickerGridProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const { formatAmount, currencySymbol } = useCurrency();
  const { applyPromoDiscount } = usePromoDiscount();

  const formatPrice = (kopeks: number) =>
    kopeks === 0
      ? t('subscription.free', 'Бесплатно')
      : `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  return (
    <>
      {/* Promo group discount banner */}
      {tariffs.some((tariff) => tariff.promo_group_name) && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-success-500/30 bg-success-500/10 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-500/20 text-success-400">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-success-400">
              {t('subscription.promoGroup.yourGroup', {
                name: tariffs.find((tariff) => tariff.promo_group_name)?.promo_group_name,
              })}
            </div>
            <div className="text-xs text-dark-400">
              {t('subscription.promoGroup.personalDiscountsApplied')}
            </div>
          </div>
        </div>
      )}

      {/* Tariff Grid */}
      {isMultiTariff &&
        purchaseOptions &&
        'all_tariffs_purchased' in purchaseOptions &&
        purchaseOptions.all_tariffs_purchased && (
          <div
            className="rounded-2xl border p-6 text-center"
            style={{ background: g.cardBg, borderColor: g.cardBorder }}
          >
            <div className="mb-2 text-3xl">✅</div>
            <h3 className="mb-1 text-lg font-semibold" style={{ color: g.text }}>
              {t('subscription.allTariffsPurchased', 'Все тарифы подключены')}
            </h3>
            <p className="mb-4 text-sm" style={{ color: g.textSecondary }}>
              {t(
                'subscription.allTariffsPurchasedDesc',
                'Вы уже приобрели все доступные тарифы. Продлить подписку можно на странице тарифа.',
              )}
            </p>
            <button
              onClick={() => navigate('/subscriptions')}
              className="rounded-xl bg-accent-500 px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-600"
            >
              {t('subscription.backToList', 'Мои подписки')}
            </button>
          </div>
        )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...tariffs]
          .filter((tariff) => {
            // In multi-tariff mode: hide already purchased tariffs
            if (isMultiTariff && tariff.is_purchased) return false;
            if (subscription?.is_trial && tariff.name.toLowerCase().includes('trial')) {
              return false;
            }
            return true;
          })
          .sort((a, b) => {
            const aIsCurrent = a.is_current || a.id === subscription?.tariff_id;
            const bIsCurrent = b.is_current || b.id === subscription?.tariff_id;
            if (aIsCurrent && !bIsCurrent) return -1;
            if (!aIsCurrent && bIsCurrent) return 1;
            return 0;
          })
          .map((tariff) => {
            const isCurrentTariff = tariff.is_current || tariff.id === subscription?.tariff_id;
            const isSubscriptionExpired =
              isTariffsMode &&
              purchaseOptions &&
              'subscription_is_expired' in purchaseOptions &&
              purchaseOptions.subscription_is_expired === true;
            const canSwitch =
              !isMultiTariff &&
              subscription &&
              subscription.tariff_id &&
              !isCurrentTariff &&
              !subscription.is_trial &&
              !isSubscriptionExpired &&
              (subscription.is_active || subscription.is_limited);
            const isLegacySubscription =
              subscription && !subscription.is_trial && !subscription.tariff_id;

            return (
              <div
                key={tariff.id}
                className={`bento-card-hover p-5 text-left transition-all ${
                  isCurrentTariff ? 'bento-card-glow border-accent-500' : ''
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-dark-100">{tariff.name}</div>
                    {tariff.description && (
                      <div className="mt-1 whitespace-pre-line text-sm text-dark-400">
                        {tariff.description}
                      </div>
                    )}
                  </div>
                  {isCurrentTariff && (
                    <span className="badge-success text-xs">{t('subscription.currentTariff')}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <ArrowDownIcon className="h-4 w-4 text-accent-400" />
                    <span className="font-medium text-dark-200">{tariff.traffic_limit_label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DevicesIcon className="h-4 w-4 text-dark-400" />
                    <span className="text-dark-300">
                      {tariff.device_limit === 0
                        ? '∞'
                        : t('subscription.devices', { count: tariff.device_limit })}
                    </span>
                  </div>
                  {tariff.traffic_reset_mode && tariff.traffic_reset_mode !== 'NO_RESET' && (
                    <div className="flex items-center gap-1.5">
                      <RestartIcon className="h-4 w-4 text-dark-400" />
                      <span className="text-dark-300">
                        {t(`subscription.trafficReset.${tariff.traffic_reset_mode}`)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Price info */}
                <div className="mt-3 border-t border-dark-700/50 pt-3 text-sm text-dark-400">
                  {(() => {
                    const dailyPrice =
                      tariff.daily_price_kopeks ?? tariff.price_per_day_kopeks ?? 0;
                    const originalDailyPrice = tariff.original_daily_price_kopeks || 0;
                    if (dailyPrice > 0 || originalDailyPrice > 0) {
                      const promoDaily = applyPromoDiscount(
                        dailyPrice,
                        originalDailyPrice > dailyPrice ? originalDailyPrice : undefined,
                      );
                      return (
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-accent-400">
                            {formatPrice(promoDaily.price)}
                          </span>
                          {promoDaily.original && promoDaily.original > promoDaily.price && (
                            <span className="text-xs text-dark-500 line-through">
                              {formatPrice(promoDaily.original)}
                            </span>
                          )}
                          <span>{t('subscription.tariff.perDay')}</span>
                          {promoDaily.percent && promoDaily.percent > 0 && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs ${
                                promoDaily.isPromoGroup
                                  ? 'bg-success-500/20 text-success-400'
                                  : 'bg-warning-500/20 text-warning-400'
                              }`}
                            >
                              -{promoDaily.percent}%
                            </span>
                          )}
                        </span>
                      );
                    }
                    if (tariff.periods.length > 0) {
                      const firstPeriod = tariff.periods[0];
                      const promoPeriod = applyPromoDiscount(
                        firstPeriod?.price_kopeks || 0,
                        firstPeriod?.original_price_kopeks,
                      );
                      return (
                        <span className="flex flex-wrap items-center gap-2">
                          <span>{t('subscription.from')}</span>
                          <span className="font-medium text-accent-400">
                            {formatPrice(promoPeriod.price)}
                          </span>
                          {promoPeriod.original && promoPeriod.original > promoPeriod.price && (
                            <span className="text-xs text-dark-500 line-through">
                              {formatPrice(promoPeriod.original)}
                            </span>
                          )}
                          {promoPeriod.percent && promoPeriod.percent > 0 && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs ${
                                promoPeriod.isPromoGroup
                                  ? 'bg-success-500/20 text-success-400'
                                  : 'bg-warning-500/20 text-warning-400'
                              }`}
                            >
                              -{promoPeriod.percent}%
                            </span>
                          )}
                        </span>
                      );
                    }
                    return (
                      <span className="font-medium text-accent-400">
                        {t('subscription.tariff.flexiblePayment')}
                      </span>
                    );
                  })()}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  {isCurrentTariff ? (
                    subscription?.is_daily ? (
                      <div className="flex-1 py-2 text-center text-sm text-dark-500">
                        {t('subscription.currentTariff')}
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectTariff(tariff)}
                        className="btn-primary flex-1 py-2 text-sm"
                      >
                        {t('subscription.extend')}
                      </button>
                    )
                  ) : isLegacySubscription ? (
                    <button
                      onClick={() => onSelectTariff(tariff)}
                      className="btn-primary flex-1 py-2 text-sm"
                    >
                      {t('subscription.tariff.selectForRenewal')}
                    </button>
                  ) : canSwitch ? (
                    <button
                      onClick={() => onSwitchTariff(tariff.id)}
                      className="btn-secondary flex-1 py-2 text-sm"
                    >
                      {t('subscription.switchTariff.switch')}
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectTariff(tariff)}
                      className="btn-primary flex-1 py-2 text-sm"
                    >
                      {t('subscription.purchase')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
