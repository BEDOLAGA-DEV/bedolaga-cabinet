import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import i18n from '../i18n';
import { promoOffersApi, PromoOfferLog, OFFER_TYPE_CONFIG, OfferType } from '../api/promoOffers';
import { usePlatform } from '../platform/hooks/usePlatform';
import { BackIcon, EditIcon, SendIcon, ClockIcon, UserIcon } from '@/components/icons';

// Helper functions
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

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    created: i18n.t('admin.promoOffers.actions.created'),
    claimed: i18n.t('admin.promoOffers.actions.claimed'),
    consumed: i18n.t('admin.promoOffers.actions.consumed'),
    disabled: i18n.t('admin.promoOffers.actions.disabled'),
  };
  return labels[action] || action;
};

const getActionColor = (action: string): string => {
  const colors: Record<string, string> = {
    created: 'bg-accent-500/20 text-accent-400',
    claimed: 'bg-success-500/20 text-success-400',
    consumed: 'bg-accent-500/20 text-accent-400',
    disabled: 'bg-dark-600 text-dark-400',
  };
  return colors[action] || 'bg-dark-600 text-dark-400';
};

const getOfferTypeIcon = (offerType: string): string => {
  return OFFER_TYPE_CONFIG[offerType as OfferType]?.icon || '🎁';
};

const getOfferTypeLabel = (offerType: string): string => {
  const config = OFFER_TYPE_CONFIG[offerType as OfferType];
  return config ? i18n.t(config.labelKey) : offerType;
};

export default function AdminPromoOffers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');

  // Queries
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['admin-promo-templates'],
    queryFn: promoOffersApi.getTemplates,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-promo-logs'],
    queryFn: () => promoOffersApi.getLogs({ limit: 100 }),
    enabled: activeTab === 'logs',
  });

  const templates = templatesData?.items || [];
  const logs = logsData?.items || [];

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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.promoOffers.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.promoOffers.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/promo-offers/send')}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
        >
          <SendIcon />
          {t('admin.promoOffers.sendButton')}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex w-fit gap-1 rounded-lg bg-dark-800 p-1">
        <button
          onClick={() => setActiveTab('templates')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-dark-700 text-dark-100'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          {t('admin.promoOffers.tabs.templates', { count: templates.length })}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs' ? 'bg-dark-700 text-dark-100' : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          {t('admin.promoOffers.tabs.logs')}
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-dark-400">{t('admin.promoOffers.noData.templates')}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                    template.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getOfferTypeIcon(template.offer_type)}</span>
                      <div>
                        <h3 className="font-medium text-dark-100">{template.name}</h3>
                        <span className="text-xs text-dark-500">
                          {getOfferTypeLabel(template.offer_type)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/admin/promo-offers/templates/${template.id}/edit`)}
                      className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                    >
                      <EditIcon />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    {template.discount_percent > 0 && (
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.promoOffers.table.discount')}:
                        </span>
                        <span className="font-medium text-accent-400">
                          {template.discount_percent}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-dark-400">
                        {t('admin.promoOffers.table.offerDuration')}:
                      </span>
                      <span className="text-dark-200">
                        {t('admin.promoOffers.table.hoursShort', { hours: template.valid_hours })}
                      </span>
                    </div>
                    {template.active_discount_hours && (
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.promoOffers.table.discountDuration')}:
                        </span>
                        <span className="text-dark-200">
                          {t('admin.promoOffers.table.hoursShort', {
                            hours: template.active_discount_hours,
                          })}
                        </span>
                      </div>
                    )}
                    {template.test_duration_hours && (
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.promoOffers.table.testAccess')}:
                        </span>
                        <span className="text-dark-200">
                          {t('admin.promoOffers.table.hoursShort', {
                            hours: template.test_duration_hours,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 border-t border-dark-700 pt-3">
                    <div className="flex items-center gap-2">
                      {template.is_active ? (
                        <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                          {t('admin.promoOffers.status.active')}
                        </span>
                      ) : (
                        <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                          {t('admin.promoOffers.status.inactive')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-dark-400">{t('admin.promoOffers.noData.logs')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: PromoOfferLog) => (
                <div key={log.id} className="rounded-xl border border-dark-700 bg-dark-800 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dark-700">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="font-medium text-dark-100">
                            {log.user?.full_name || log.user?.username || `User #${log.user_id}`}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${getActionColor(log.action)}`}
                          >
                            {getActionLabel(log.action)}
                          </span>
                        </div>
                        <div className="text-sm text-dark-400">
                          {log.source && <span>{getOfferTypeLabel(log.source)}</span>}
                          {log.percent && log.percent > 0 && (
                            <span className="ml-2 text-accent-400">{log.percent}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="pl-13 flex items-center gap-1 text-xs text-dark-500 sm:pl-0">
                      <ClockIcon className="h-4 w-4" />
                      {formatDateTime(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
