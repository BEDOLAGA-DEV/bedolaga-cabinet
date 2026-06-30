import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { promocodesApi, PromoCode, PromoCodeType } from '../api/promocodes';
import { usePlatform } from '../platform/hooks/usePlatform';
import { copyToClipboard } from '../utils/clipboard';
import {
  BackIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  CopyIcon,
  ChartIcon,
  ChartBarIcon,
  CheckCircleIcon,
  TagIcon,
  TicketIcon,
} from '@/components/icons';
import { StatCard } from '../components/stats';

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

export default function AdminPromocodes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Query
  const { data: promocodesData, isLoading } = useQuery({
    queryKey: ['admin-promocodes'],
    queryFn: () => promocodesApi.getPromocodes({ limit: 100 }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: promocodesApi.deletePromocode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
      setDeleteConfirm(null);
    },
  });

  const handleCopyCode = (code: string) => {
    void copyToClipboard(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const promocodes = promocodesData?.items || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-dark-100">{t('admin.promocodes.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.promocodes.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/promocodes/create')}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
        >
          <PlusIcon />
          {t('admin.promocodes.addPromocode')}
        </button>
      </div>

      {/* Stats Overview */}
      {promocodes.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('admin.promocodes.stats.totalPromocodes')}
            value={promocodes.length}
            icon={<TagIcon className="h-5 w-5" />}
            tone="neutral"
          />
          <StatCard
            label={t('admin.promocodes.stats.activeCount')}
            value={promocodes.filter((p) => p.is_active && p.is_valid).length}
            icon={<CheckCircleIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.promocodes.stats.usagesCount')}
            value={promocodes.reduce((sum, p) => sum + p.current_uses, 0)}
            icon={<ChartBarIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.promocodes.stats.exhausted')}
            value={promocodes.filter((p) => p.uses_left === 0 && p.max_uses > 0).length}
            icon={<TicketIcon className="h-5 w-5" />}
            tone="warning"
          />
        </div>
      )}

      {/* Promocodes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : promocodes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.promocodes.noPromocodes')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promocodes.map((promo: PromoCode) => (
            <div
              key={promo.id}
              className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                promo.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              {/* Mobile: stacked layout, Desktop: row layout */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  {/* Code with copy button */}
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      onClick={() => handleCopyCode(promo.code)}
                      className="flex items-center gap-1.5 font-mono font-medium text-dark-100 transition-colors hover:text-accent-400"
                    >
                      {promo.code}
                      {copiedCode === promo.code ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                  {/* Badges - wrap on mobile */}
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className={`rounded px-2 py-0.5 text-xs ${getTypeColor(promo.type)}`}>
                      {getTypeLabel(promo.type)}
                    </span>
                    {!promo.is_active && (
                      <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                        {t('admin.promocodes.stats.inactive')}
                      </span>
                    )}
                    {promo.first_purchase_only && (
                      <span className="rounded bg-warning-500/20 px-2 py-0.5 text-xs text-warning-400">
                        {t('admin.promocodes.firstPurchase')}
                      </span>
                    )}
                  </div>
                  {/* Info line */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    {promo.type === 'balance' && (
                      <span className="text-success-400">
                        +{promo.balance_bonus_rubles} {t('admin.promocodes.form.rub')}
                      </span>
                    )}
                    {(promo.type === 'subscription_days' ||
                      promo.type === 'trial_subscription') && (
                      <span className="text-accent-400">
                        +{promo.subscription_days} {t('admin.promocodes.form.days')}
                      </span>
                    )}
                    {promo.type === 'discount' && (
                      <span className="text-pink-400">
                        {t('admin.promocodes.discountForHours', {
                          percent: promo.balance_bonus_kopeks,
                          hours: promo.subscription_days,
                        })}
                      </span>
                    )}
                    <span>
                      {t('admin.promocodes.used')}: {promo.current_uses}/
                      {promo.max_uses === 0 ? '∞' : promo.max_uses}
                    </span>
                    {promo.valid_until && (
                      <span>
                        {t('admin.promocodes.until')}: {formatDate(promo.valid_until)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons - full width on mobile */}
                <div className="flex items-center gap-2 border-t border-dark-700 pt-3 sm:border-0 sm:pt-0">
                  <button
                    onClick={() => navigate(`/admin/promocodes/${promo.id}/stats`)}
                    className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-accent-500/20 hover:text-accent-400 sm:flex-none"
                    title={t('admin.promocodes.actions.stats')}
                  >
                    <ChartIcon />
                  </button>
                  <button
                    onClick={() => navigate(`/admin/promocodes/${promo.id}/edit`)}
                    className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100 sm:flex-none"
                    title={t('admin.promocodes.actions.edit')}
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(promo.id)}
                    className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-error-500/20 hover:text-error-400 sm:flex-none"
                    title={t('admin.promocodes.actions.delete')}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-dark-800 p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark-100">
              {t('admin.promocodes.confirm.deletePromocode')}
            </h3>
            <p className="mb-6 text-dark-400">
              {t('admin.promocodes.confirm.deletePromocodeText')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
              >
                {t('admin.promocodes.form.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="rounded-lg bg-error-500 px-4 py-2 text-white transition-colors hover:bg-error-600"
              >
                {t('admin.promocodes.confirm.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
