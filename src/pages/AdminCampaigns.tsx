import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { campaignsApi, CampaignListItem, CampaignBonusType } from '../api/campaigns';
import { PlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon, ChartIcon } from '../components/icons';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

// Bonus type labels and colors
const bonusTypeConfig: Record<
  CampaignBonusType,
  { labelKey: string; color: string; bgColor: string }
> = {
  balance: {
    labelKey: 'admin.campaigns.bonusType.balance',
    color: 'text-success-400',
    bgColor: 'bg-success-500/20',
  },
  subscription: {
    labelKey: 'admin.campaigns.bonusType.subscription',
    color: 'text-accent-400',
    bgColor: 'bg-accent-500/20',
  },
  tariff: {
    labelKey: 'admin.campaigns.bonusType.tariff',
    color: 'text-accent-400',
    bgColor: 'bg-accent-500/20',
  },
  none: {
    labelKey: 'admin.campaigns.bonusType.none',
    color: 'text-dark-400',
    bgColor: 'bg-dark-500/20',
  },
};

// Icons
const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

// Locale mapping for formatting
const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };

// Format number as rubles
const formatRubles = (kopeks: number) => {
  const locale = localeMap[i18n.language] || 'ru-RU';
  return (
    (kopeks / 100).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) +
    ' ₽'
  );
};

// Main Component
export default function AdminCampaigns() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Queries
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: () => campaignsApi.getCampaigns(true),
  });

  const { data: overview } = useQuery({
    queryKey: ['admin-campaigns-overview'],
    queryFn: () => campaignsApi.getOverview(),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: campaignsApi.deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns-overview'] });
      setDeleteConfirm(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: campaignsApi.toggleCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
    },
  });

  const campaigns = campaignsData?.campaigns || [];

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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.campaigns.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.campaigns.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/campaigns/create')}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
        >
          <PlusIcon />
          {t('admin.campaigns.createButton')}
        </button>
      </div>

      {/* Overview */}
      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-dark-100">{overview.total}</div>
            <div className="text-sm text-dark-400">
              {t('admin.campaigns.overview.totalCampaigns')}
            </div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-success-400">{overview.active}</div>
            <div className="text-sm text-dark-400">{t('admin.campaigns.overview.active')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-accent-400">{overview.total_registrations}</div>
            <div className="text-sm text-dark-400">
              {t('admin.campaigns.overview.registrations')}
            </div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-success-400">
              {formatRubles(overview.total_balance_issued_kopeks)}
            </div>
            <div className="text-sm text-dark-400">
              {t('admin.campaigns.overview.bonusesIssued')}
            </div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.campaigns.noData')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: CampaignListItem) => (
            <div
              key={campaign.id}
              className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                campaign.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate font-medium text-dark-100">{campaign.name}</h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${bonusTypeConfig[campaign.bonus_type].bgColor} ${bonusTypeConfig[campaign.bonus_type].color}`}
                    >
                      {t(bonusTypeConfig[campaign.bonus_type].labelKey)}
                    </span>
                    {!campaign.is_active && (
                      <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                        {t('admin.campaigns.table.inactive')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span className="font-mono text-xs">?start={campaign.start_parameter}</span>
                    <span>
                      {t('admin.campaigns.table.registrations', {
                        count: campaign.registrations_count,
                      })}
                    </span>
                    <span>
                      {t('admin.campaigns.table.revenue', {
                        amount: formatRubles(campaign.total_revenue_kopeks),
                      })}
                    </span>
                    <span>
                      {t('admin.campaigns.table.conversion', { rate: campaign.conversion_rate })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Stats */}
                  <button
                    onClick={() => navigate(`/admin/campaigns/${campaign.id}/stats`)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                    title={t('admin.campaigns.table.statistics')}
                  >
                    <ChartIcon />
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => toggleMutation.mutate(campaign.id)}
                    className={`rounded-lg p-2 transition-colors ${
                      campaign.is_active
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={
                      campaign.is_active
                        ? t('admin.campaigns.table.deactivate')
                        : t('admin.campaigns.table.activate')
                    }
                  >
                    {campaign.is_active ? <CheckIcon /> : <XIcon />}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit`)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                    title={t('admin.campaigns.table.edit')}
                  >
                    <EditIcon />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirm(campaign.id)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-error-500/20 hover:text-error-400"
                    title={t('admin.campaigns.table.delete')}
                    disabled={campaign.registrations_count > 0}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-dark-800 p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark-100">
              {t('admin.campaigns.confirm.deleteTitle')}
            </h3>
            <p className="mb-6 text-dark-400">{t('admin.campaigns.confirm.deleteText')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
              >
                {t('admin.campaigns.confirm.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="rounded-lg bg-error-500 px-4 py-2 text-white transition-colors hover:bg-error-600"
              >
                {t('admin.campaigns.confirm.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
