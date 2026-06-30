import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { promocodesApi, PromoCodeType } from '../api/promocodes';
import { AdminBackButton } from '../components/admin';
import { StatCard } from '../components/stats';
import {
  EditIcon,
  ClockIcon,
  UserIcon,
  ChartBarIcon,
  SparklesIcon,
  TicketIcon,
} from '@/components/icons';

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
              className={`min-w-0 break-all rounded-lg px-3 py-1.5 font-mono text-lg font-bold ${getTypeColor(promocode.type)}`}
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
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
        >
          <EditIcon />
          {t('admin.promocodes.modal.edit')}
        </button>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label={t('admin.promocodes.stats.totalUses')}
            value={promocode.total_uses}
            icon={<ChartBarIcon className="h-5 w-5" />}
            tone="neutral"
          />
          <StatCard
            label={t('admin.promocodes.stats.today')}
            value={promocode.today_uses}
            icon={<SparklesIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.promocodes.stats.remaining')}
            value={promocode.max_uses === 0 ? '∞' : promocode.uses_left}
            icon={<TicketIcon className="h-5 w-5" />}
            tone="accent"
          />
        </div>

        {/* Details */}
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
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
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <h4 className="mb-4 flex items-center gap-2 font-medium text-dark-200">
            <ClockIcon className="h-4 w-4" />
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
                      <UserIcon className="h-4 w-4" />
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
