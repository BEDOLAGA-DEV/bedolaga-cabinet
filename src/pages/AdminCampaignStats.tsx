import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { campaignsApi, CampaignBonusType } from '../api/campaigns';
import type { AdminCampaignChartData } from '../api/campaigns';
import { AdminBackButton } from '../components/admin';
import { DailyChart, PeriodComparison, StatCard } from '../components/stats';
import { PARTNER_STATS } from '../constants/partner';
import { useCurrency } from '../hooks/useCurrency';
import { copyToClipboard } from '../utils/clipboard';
import { useHaptic } from '../platform';
import { ChartIcon, ChevronDownIcon, CopyIcon, LinkIcon, UsersIcon } from '@/components/icons';

// Bonus type config
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
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  none: {
    labelKey: 'admin.campaigns.bonusType.none',
    color: 'text-dark-400',
    bgColor: 'bg-dark-600',
  },
};

export default function AdminCampaignStats() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const numericId = id ? Number(id) : null;
  const isValidId = numericId !== null && !isNaN(numericId);
  const navigate = useNavigate();
  const haptic = useHaptic();
  const { formatWithCurrency } = useCurrency();
  const [copiedBot, setCopiedBot] = useState(false);
  const [copiedWeb, setCopiedWeb] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const copyBotTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyWebTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(copyBotTimer.current);
      clearTimeout(copyWebTimer.current);
    };
  }, []);

  // Fetch stats
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['campaign-stats', id],
    queryFn: () => campaignsApi.getCampaignStats(numericId!),
    enabled: isValidId,
    staleTime: PARTNER_STATS.STATS_STALE_TIME,
  });

  // Fetch registrations when users section is open
  const { data: registrationsData, isLoading: usersLoading } = useQuery({
    queryKey: ['campaign-registrations', id],
    queryFn: () => campaignsApi.getCampaignRegistrations(numericId!, 1, 50),
    enabled: isValidId && showUsers,
  });

  // Fetch chart data
  const { data: chartData, isLoading: chartLoading } = useQuery<AdminCampaignChartData>({
    queryKey: ['campaign-chart-data', id],
    queryFn: () => campaignsApi.getChartData(numericId!),
    enabled: isValidId,
    staleTime: PARTNER_STATS.STATS_STALE_TIME,
  });

  const handleCopy = useCallback(
    async (url: string, type: 'bot' | 'web') => {
      try {
        await copyToClipboard(url);
        haptic.notification('success');
        if (type === 'bot') {
          setCopiedBot(true);
          clearTimeout(copyBotTimer.current);
          copyBotTimer.current = setTimeout(
            () => setCopiedBot(false),
            PARTNER_STATS.COPY_FEEDBACK_MS,
          );
        } else {
          setCopiedWeb(true);
          clearTimeout(copyWebTimer.current);
          copyWebTimer.current = setTimeout(
            () => setCopiedWeb(false),
            PARTNER_STATS.COPY_FEEDBACK_MS,
          );
        }
      } catch {
        haptic.notification('error');
      }
    },
    [haptic],
  );

  const formatDate = useCallback(
    (date: string | null): string => {
      if (!date) return '-';
      return new Date(date).toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [i18n.language],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/campaigns" />
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.campaigns.stats.title')}
          </h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.campaigns.stats.loadError')}</p>
          <button
            onClick={() => navigate('/admin/campaigns')}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/campaigns" />
          <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
            <ChartIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-dark-100">{stats.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs ${bonusTypeConfig[stats.bonus_type].bgColor} ${bonusTypeConfig[stats.bonus_type].color}`}
              >
                {t(bonusTypeConfig[stats.bonus_type].labelKey)}
              </span>
              {stats.is_active ? (
                <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                  {t('admin.campaigns.stats.active')}
                </span>
              ) : (
                <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                  {t('admin.campaigns.stats.inactive')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Links */}
        {(stats.deep_link || stats.web_link) && (
          <div className="space-y-3">
            {stats.deep_link && (
              <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
                <div className="mb-1 text-xs font-medium text-dark-500">
                  {t('admin.campaigns.stats.botLink')}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    <span className="truncate text-sm text-dark-300">{stats.deep_link}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(stats.deep_link!, 'bot')}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-dark-700 px-3 py-2 text-dark-300 transition-colors hover:bg-dark-600"
                  >
                    <CopyIcon />
                    <span className="text-sm">
                      {copiedBot
                        ? t('admin.campaigns.stats.copied')
                        : t('admin.campaigns.stats.copy')}
                    </span>
                  </button>
                </div>
              </div>
            )}
            {stats.web_link && (
              <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
                <div className="mb-1 text-xs font-medium text-dark-500">
                  {t('admin.campaigns.stats.webLink')}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    <span className="truncate text-sm text-dark-300">{stats.web_link}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(stats.web_link!, 'web')}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-dark-700 px-3 py-2 text-dark-300 transition-colors hover:bg-dark-600"
                  >
                    <CopyIcon />
                    <span className="text-sm">
                      {copiedWeb
                        ? t('admin.campaigns.stats.copied')
                        : t('admin.campaigns.stats.copy')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-xl font-bold text-dark-100 sm:text-2xl">{stats.registrations}</div>
            <div className="text-xs text-dark-500">{t('admin.campaigns.stats.registrations')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="truncate text-xl font-bold text-success-400 sm:text-2xl">
              {formatWithCurrency(stats.total_revenue_kopeks / PARTNER_STATS.KOPEKS_DIVISOR)}
            </div>
            <div className="text-xs text-dark-500">{t('admin.campaigns.stats.revenue')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-xl font-bold text-accent-400 sm:text-2xl">
              {stats.paid_users_count}
            </div>
            <div className="text-xs text-dark-500">{t('admin.campaigns.stats.paidUsers')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-xl font-bold text-accent-400 sm:text-2xl">
              {stats.conversion_rate}%
            </div>
            <div className="text-xs text-dark-500">{t('admin.campaigns.stats.conversion')}</div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h3 className="mb-4 font-medium text-dark-200">
            {t('admin.campaigns.stats.detailedStats')}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.campaigns.stats.bonusesIssued')}
              </div>
              {stats.bonus_type === 'balance' && (
                <div className="text-lg font-medium text-success-400">
                  {formatWithCurrency(stats.balance_issued_kopeks / PARTNER_STATS.KOPEKS_DIVISOR)}
                </div>
              )}
              {stats.bonus_type === 'subscription' && (
                <div className="text-lg font-medium text-accent-400">
                  {t('admin.campaigns.stats.subscriptionsIssued', {
                    count: stats.subscription_issued,
                  })}
                </div>
              )}
              {stats.bonus_type === 'tariff' && (
                <div className="text-lg font-medium text-accent-400">
                  {t('admin.campaigns.stats.tariffsIssued', { count: stats.subscription_issued })}
                </div>
              )}
              {stats.bonus_type === 'none' && (
                <div className="text-lg font-medium text-dark-400">-</div>
              )}
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.campaigns.stats.avgRevenuePerUser')}
              </div>
              <div className="text-lg font-medium text-dark-200">
                {formatWithCurrency(
                  stats.avg_revenue_per_user_kopeks / PARTNER_STATS.KOPEKS_DIVISOR,
                )}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.campaigns.stats.avgFirstPayment')}
              </div>
              <div className="text-lg font-medium text-dark-200">
                {formatWithCurrency(stats.avg_first_payment_kopeks / PARTNER_STATS.KOPEKS_DIVISOR)}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.campaigns.stats.trialSubscriptions')}
              </div>
              <div className="text-lg font-medium text-dark-200">
                {t('admin.campaigns.stats.trialCount', {
                  total: stats.trial_users_count,
                  active: stats.active_trials_count,
                })}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.campaigns.stats.trialConversion')}
              </div>
              <div className="text-lg font-medium text-dark-200">
                {stats.trial_conversion_rate}%
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.campaigns.stats.lastRegistration')}
              </div>
              <div className="text-sm font-medium text-dark-200">
                {formatDate(stats.last_registration)}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="space-y-4">
          {chartLoading ? (
            <div className="space-y-3">
              <div className="h-52 animate-pulse rounded-xl bg-dark-800/30" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 animate-pulse rounded-xl bg-dark-800/30" />
                <div className="h-24 animate-pulse rounded-xl bg-dark-800/30" />
              </div>
            </div>
          ) : chartData ? (
            <>
              {/* Deposits vs Spending */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={t('admin.campaigns.stats.totalDeposits')}
                  value={formatWithCurrency(
                    chartData.total_deposits_kopeks / PARTNER_STATS.KOPEKS_DIVISOR,
                  )}
                  valueClassName="text-success-400"
                />
                <StatCard
                  label={t('admin.campaigns.stats.totalSpending')}
                  value={formatWithCurrency(
                    chartData.total_spending_kopeks / PARTNER_STATS.KOPEKS_DIVISOR,
                  )}
                  valueClassName="text-accent-400"
                />
              </div>
              <DailyChart
                data={chartData.daily_stats}
                chartId={`admin-${id}`}
                title={t('admin.campaigns.stats.dailyChart')}
                earningsLabel={t('admin.campaigns.stats.chartRevenue')}
                countLabel={t('admin.campaigns.stats.chartRegistrations')}
              />
              <PeriodComparison
                data={chartData.period_comparison}
                title={t('admin.campaigns.stats.periodComparison')}
                countLabel={t('admin.campaigns.stats.chartRegistrations')}
                earningsLabel={t('admin.campaigns.stats.chartRevenue')}
                comparisonLabel={t('admin.campaigns.stats.vsLastWeek')}
              />
              {/* Top Registrations */}
              {chartData.top_registrations.length > 0 && (
                <div className="bento-card">
                  <h4 className="mb-3 text-sm font-semibold text-dark-200">
                    {t('admin.campaigns.stats.topRegistrations')}
                  </h4>
                  <div className="space-y-2">
                    {chartData.top_registrations.map((reg) => (
                      <Link
                        key={reg.id}
                        to={`/admin/users/${reg.id}`}
                        className="flex items-center justify-between rounded-xl border border-dark-700/30 bg-dark-800/30 p-3 transition-colors hover:bg-dark-700/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 truncate text-sm font-medium text-dark-100">
                              {reg.full_name}
                            </span>
                            {reg.is_active && (
                              <span className="badge-success">
                                {t('admin.campaigns.stats.active')}
                              </span>
                            )}
                            {reg.has_paid && !reg.is_active && (
                              <span className="badge-info">{t('admin.campaigns.stats.paid')}</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-dark-500">
                            {new Date(reg.created_at).toLocaleDateString(i18n.language)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-success-400">
                          {formatWithCurrency(
                            reg.total_earnings_kopeks / PARTNER_STATS.KOPEKS_DIVISOR,
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Users Section */}
        <div className="rounded-xl border border-dark-700 bg-dark-800">
          <button
            onClick={() => setShowUsers(!showUsers)}
            className="flex w-full items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <UsersIcon />
              <span className="font-medium text-dark-200">
                {t('admin.campaigns.stats.users')} ({stats.registrations})
              </span>
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 text-dark-400 transition-transform ${showUsers ? 'rotate-180' : ''}`}
            />
          </button>

          {showUsers && (
            <div className="border-t border-dark-700 p-4">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                </div>
              ) : registrationsData?.registrations.length === 0 ? (
                <div className="py-8 text-center text-dark-500">
                  {t('admin.campaigns.stats.noUsers')}
                </div>
              ) : (
                <div className="space-y-2">
                  {registrationsData?.registrations.map((reg) => (
                    <Link
                      key={reg.id}
                      to={`/admin/users/${reg.user_id}`}
                      className="flex items-center justify-between rounded-lg bg-dark-700/50 p-3 transition-colors hover:bg-dark-700"
                    >
                      <div>
                        <div className="font-medium text-dark-100">
                          {reg.first_name ||
                            reg.username ||
                            `${t('admin.campaigns.stats.users')} #${reg.user_id}`}
                        </div>
                        <div className="text-xs text-dark-500">{reg.telegram_id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {reg.has_paid && (
                          <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                            {t('admin.campaigns.stats.paid')}
                          </span>
                        )}
                        {reg.has_subscription && (
                          <span className="rounded bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
                            {t('admin.campaigns.stats.hasSub')}
                          </span>
                        )}
                        <span className="text-xs text-dark-500">{formatDate(reg.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
