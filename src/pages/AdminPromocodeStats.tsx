import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { promocodesApi, PromoCodeType } from '../api/promocodes';
import { AdminBackButton } from '../components/admin';
import { useBackButton } from '../platform/hooks/useBackButton';

// Icons
const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

// Helper functions
const getTypeLabel = (type: PromoCodeType): string => {
  const labels: Record<PromoCodeType, string> = {
    balance: i18n.t('admin.promocodes.type.balance'),
    subscription_days: i18n.t('admin.promocodes.type.subscriptionDays'),
    trial_subscription: i18n.t('admin.promocodes.type.trialSubscription'),
    promo_group: i18n.t('admin.promocodes.type.promoGroup'),
    discount: i18n.t('admin.promocodes.type.discount'),
  };
  return labels[type] || type;
};

const getTypeColor = (type: PromoCodeType): string => {
  const colors: Record<PromoCodeType, string> = {
    balance: 'bg-success-500/20 text-success-400',
    subscription_days: 'bg-accent-500/20 text-accent-400',
    trial_subscription: 'bg-accent-500/20 text-accent-400',
    promo_group: 'bg-warning-500/20 text-warning-400',
    discount: 'bg-pink-500/20 text-pink-400',
  };
  return colors[type] || 'bg-dark-600 text-dark-300';
};

const formatDate = (date: string | null): string => {
  if (!date) return '-';
  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };
  const locale = localeMap[i18n.language] || 'ru-RU';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (date: string | null): string => {
  if (!date) return '-';
  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };
  const locale = localeMap[i18n.language] || 'ru-RU';
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminPromocodeStats() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useBackButton(() => navigate('/admin/promocodes'));

  const {
    data: promocode,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-promocode', id],
    queryFn: () => promocodesApi.getPromocode(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !promocode) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/promocodes" />
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.promocodes.stats.title')}
          </h1>
        </div>
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.promocodes.stats.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/promocodes" />
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`rounded-lg px-3 py-1.5 font-mono text-lg font-bold ${getTypeColor(promocode.type)}`}
            >
              {promocode.code}
            </div>
            <span className={`rounded px-2 py-0.5 text-xs ${getTypeColor(promocode.type)}`}>
              {getTypeLabel(promocode.type)}
            </span>
            {!promocode.is_active && (
              <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                {t('admin.promocodes.stats.inactive')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate(`/admin/promocodes/${id}/edit`)}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
        >
          <EditIcon />
          {t('admin.promocodes.modal.edit')}
        </button>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="mb-1 text-3xl font-bold text-dark-100">{promocode.total_uses}</div>
            <div className="text-sm text-dark-400">{t('admin.promocodes.stats.totalUses')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="mb-1 text-3xl font-bold text-success-400">{promocode.today_uses}</div>
            <div className="text-sm text-dark-400">{t('admin.promocodes.stats.today')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="mb-1 text-3xl font-bold text-accent-400">
              {promocode.max_uses === 0 ? '∞' : promocode.uses_left}
            </div>
            <div className="text-sm text-dark-400">{t('admin.promocodes.stats.remaining')}</div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h4 className="mb-4 font-medium text-dark-200">{t('admin.promocodes.stats.details')}</h4>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
              <span className="text-dark-400">{t('admin.promocodes.stats.type')}:</span>
              <span className="text-dark-200">{getTypeLabel(promocode.type)}</span>
            </div>
            {promocode.type === 'balance' && (
              <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
                <span className="text-dark-400">{t('admin.promocodes.stats.bonus')}:</span>
                <span className="text-success-400">
                  +{promocode.balance_bonus_rubles} {t('admin.promocodes.form.rub')}
                </span>
              </div>
            )}
            {(promocode.type === 'subscription_days' ||
              promocode.type === 'trial_subscription') && (
              <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
                <span className="text-dark-400">{t('admin.promocodes.stats.daysLabel')}:</span>
                <span className="text-accent-400">+{promocode.subscription_days}</span>
              </div>
            )}
            {promocode.type === 'discount' && (
              <>
                <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
                  <span className="text-dark-400">
                    {t('admin.promocodes.stats.discountLabel')}:
                  </span>
                  <span className="text-pink-400">-{promocode.balance_bonus_kopeks}%</span>
                </div>
                <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
                  <span className="text-dark-400">{t('admin.promocodes.stats.validFor')}:</span>
                  <span className="text-pink-400">
                    {t('admin.promocodes.stats.hoursValue', {
                      count: promocode.subscription_days,
                    })}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
              <span className="text-dark-400">{t('admin.promocodes.stats.limit')}:</span>
              <span className="text-dark-200">
                {promocode.current_uses}/{promocode.max_uses === 0 ? '∞' : promocode.max_uses}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
              <span className="text-dark-400">{t('admin.promocodes.stats.status')}:</span>
              <span className={promocode.is_valid ? 'text-success-400' : 'text-error-400'}>
                {promocode.is_valid
                  ? t('admin.promocodes.stats.active')
                  : t('admin.promocodes.stats.inactive')}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
              <span className="text-dark-400">{t('admin.promocodes.stats.created')}:</span>
              <span className="text-dark-200">{formatDateTime(promocode.created_at)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-dark-700/50 p-3">
              <span className="text-dark-400">{t('admin.promocodes.stats.validUntil')}:</span>
              <span className="text-dark-200">
                {promocode.valid_until
                  ? formatDate(promocode.valid_until)
                  : t('admin.promocodes.stats.unlimited')}
              </span>
            </div>
            {promocode.first_purchase_only && (
              <div className="flex justify-between rounded-lg bg-dark-700/50 p-3 sm:col-span-2">
                <span className="text-dark-400">{t('admin.promocodes.stats.restriction')}:</span>
                <span className="text-warning-400">
                  {t('admin.promocodes.stats.firstPurchaseOnly')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Usage History */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h4 className="mb-4 flex items-center gap-2 font-medium text-dark-200">
            <ClockIcon />
            {t('admin.promocodes.stats.usageHistory')}
          </h4>
          {promocode.recent_uses.length === 0 ? (
            <p className="py-8 text-center text-sm text-dark-500">
              {t('admin.promocodes.stats.noUsages')}
            </p>
          ) : (
            <div className="space-y-2">
              {promocode.recent_uses.map((use) => (
                <div
                  key={use.id}
                  className="flex flex-col gap-2 rounded-lg bg-dark-700/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-500">
                      <UserIcon />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-dark-200">
                        {use.user_full_name || use.user_username || `User #${use.user_id}`}
                      </div>
                      {use.user_username && (
                        <div className="truncate text-xs text-dark-500">@{use.user_username}</div>
                      )}
                    </div>
                  </div>
                  <div className="pl-11 text-xs text-dark-400 sm:pl-0">
                    {formatDateTime(use.used_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
