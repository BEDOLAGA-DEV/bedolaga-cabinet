import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { promoApi, LoyaltyTierInfo } from '../api/promo';

const StarIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>
);

export default function Info() {
  const { t } = useTranslation();

  const { data: loyaltyData, isLoading: loyaltyLoading } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: promoApi.getLoyaltyTiers,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const getStatusBadge = (tier: LoyaltyTierInfo) => {
    if (tier.is_current) {
      return (
        <span className="rounded-full bg-accent-500/20 px-2 py-1 text-xs font-medium text-accent-400">
          {t('info.statusCurrent')}
        </span>
      );
    }
    if (tier.is_achieved) {
      return (
        <span className="rounded-full bg-success-500/20 px-2 py-1 text-xs font-medium text-success-400">
          {t('info.statusAchieved')}
        </span>
      );
    }
    return (
      <span className="rounded-full bg-dark-600 px-2 py-1 text-xs font-medium text-dark-400">
        {t('info.statusLocked')}
      </span>
    );
  };

  const hasAnyDiscount = (tier: LoyaltyTierInfo) => {
    return (
      tier.server_discount_percent > 0 ||
      tier.traffic_discount_percent > 0 ||
      tier.device_discount_percent > 0 ||
      Object.keys(tier.period_discounts).length > 0
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <StarIcon />
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">Статус</h1>
      </div>

      {/* Контент */}
      {loyaltyLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : !loyaltyData || loyaltyData.tiers.length === 0 ? (
        <div className="py-8 text-center text-dark-400">{t('info.noLoyaltyTiers')}</div>
      ) : (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="bento-card p-5">
            <h3 className="mb-4 text-lg font-semibold text-dark-50">{t('info.yourProgress')}</h3>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-1 text-xs text-dark-400">{t('info.totalSpent')}</div>
                <div className="truncate text-base font-bold text-dark-50 sm:text-lg">
                  {formatCurrency(loyaltyData.current_spent_rubles)}
                </div>
              </div>
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-1 text-xs text-dark-400">{t('info.currentStatus')}</div>
                <div className="truncate text-base font-bold text-accent-400 sm:text-lg">
                  {loyaltyData.current_tier_name || '-'}
                </div>
              </div>
            </div>

            {/* Progress bar to next tier */}
            {loyaltyData.next_tier_name && loyaltyData.next_tier_threshold_rubles ? (
              <div>
                <div className="mb-2 flex flex-col gap-1 text-xs text-dark-400 sm:flex-row sm:justify-between">
                  <span>
                    {t('info.nextStatus')}: {loyaltyData.next_tier_name}
                  </span>
                  <span>
                    {t('info.toNextStatus')}:{' '}
                    {formatCurrency(
                      Math.max(
                        0,
                        loyaltyData.next_tier_threshold_rubles - loyaltyData.current_spent_rubles,
                      ),
                    )}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-dark-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, loyaltyData.progress_percent)}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-xs text-dark-400">
                  {loyaltyData.progress_percent.toFixed(1)}%
                </div>
              </div>
            ) : (
              <div className="py-2 text-center font-medium text-success-400">
                {t('info.allStatusesAchieved')}
              </div>
            )}
          </div>

          {/* Tiers List */}
          <div className="space-y-3">
            {loyaltyData.tiers.map((tier) => (
              <div
                key={tier.id}
                className={`bento-card p-4 transition-all ${
                  tier.is_current
                    ? 'bg-accent-500/5 ring-2 ring-accent-500/50'
                    : tier.is_achieved
                      ? 'bg-success-500/5'
                      : 'opacity-70'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        tier.is_current
                          ? 'bg-accent-500/20 text-accent-400'
                          : tier.is_achieved
                            ? 'bg-success-500/20 text-success-400'
                            : 'bg-dark-700 text-dark-400'
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate font-semibold text-dark-50">{tier.name}</h4>
                      <p className="text-xs text-dark-400">
                        {t('info.threshold')}: {formatCurrency(tier.threshold_rubles)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0">{getStatusBadge(tier)}</span>
                </div>

                {/* Discounts */}
                {hasAnyDiscount(tier) ? (
                  <div className="rounded-xl bg-dark-800/50 p-3">
                    <div className="mb-2 text-xs text-dark-400">{t('info.discounts')}:</div>
                    <div className="flex flex-wrap gap-2">
                      {tier.server_discount_percent > 0 && (
                        <span className="rounded-lg bg-dark-700 px-2 py-1 text-xs text-dark-200">
                          {t('info.serverDiscount')}: -{tier.server_discount_percent}%
                        </span>
                      )}
                      {tier.traffic_discount_percent > 0 && (
                        <span className="rounded-lg bg-dark-700 px-2 py-1 text-xs text-dark-200">
                          {t('info.trafficDiscount')}: -{tier.traffic_discount_percent}%
                        </span>
                      )}
                      {tier.device_discount_percent > 0 && (
                        <span className="rounded-lg bg-dark-700 px-2 py-1 text-xs text-dark-200">
                          {t('info.deviceDiscount')}: -{tier.device_discount_percent}%
                        </span>
                      )}
                      {Object.entries(tier.period_discounts).map(([days, percent]) => (
                        <span
                          key={days}
                          className="rounded-lg bg-dark-700 px-2 py-1 text-xs text-dark-200"
                        >
                          {t('info.periodDiscount', { days })}: -{percent}%
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs italic text-dark-500">{t('info.noDiscounts')}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
