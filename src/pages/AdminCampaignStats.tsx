import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { campaignsApi, CampaignBonusType } from '../api/campaigns';
import { AdminBackButton } from '../components/admin';

// Icons
const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

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

// Helper functions
const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };

const formatRubles = (kopeks: number): string => {
  const rubles = kopeks / 100;
  const locale = localeMap[i18n.language] || 'ru-RU';
  return `${rubles.toLocaleString(locale)} ₽`;
};

const formatDate = (date: string | null): string => {
  if (!date) return '-';
  const locale = localeMap[i18n.language] || 'ru-RU';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminCampaignStats() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    queryFn: () => campaignsApi.getCampaignStats(Number(id)),
    enabled: !!id,
  });

  // Fetch registrations when users section is open
  const { data: registrationsData, isLoading: usersLoading } = useQuery({
    queryKey: ['campaign-registrations', id],
    queryFn: () => campaignsApi.getCampaignRegistrations(Number(id), 1, 50),
    enabled: !!id && showUsers,
  });

  const copyBotLink = async () => {
    if (stats?.deep_link) {
      try {
        await navigator.clipboard.writeText(stats.deep_link);
        setCopiedBot(true);
        clearTimeout(copyBotTimer.current);
        copyBotTimer.current = setTimeout(() => setCopiedBot(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

  const copyWebLink = async () => {
    if (stats?.web_link) {
      try {
        await navigator.clipboard.writeText(stats.web_link);
        setCopiedWeb(true);
        clearTimeout(copyWebTimer.current);
        copyWebTimer.current = setTimeout(() => setCopiedWeb(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

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
            <ChartIcon />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{stats.name}</h1>
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
                    <LinkIcon />
                    <span className="truncate text-sm text-dark-300">{stats.deep_link}</span>
                  </div>
                  <button
                    onClick={copyBotLink}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-dark-700 px-3 py-1.5 text-dark-300 transition-colors hover:bg-dark-600"
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
                    <LinkIcon />
                    <span className="truncate text-sm text-dark-300">{stats.web_link}</span>
                  </div>
                  <button
                    onClick={copyWebLink}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-dark-700 px-3 py-1.5 text-dark-300 transition-colors hover:bg-dark-600"
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
            <div className="text-2xl font-bold text-dark-100">{stats.registrations}</div>
            <div className="text-xs text-dark-500">{t('admin.campaigns.stats.registrations')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-2xl font-bold text-success-400">
              {formatRubles(stats.total_revenue_kopeks)}
            </div>
            <div className="text-xs text-dark-500">{t('admin.campaigns.stats.revenue')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-2xl font-bold text-accent-400">{stats.paid_users_count}</div>
            <div className="text-xs text-dark-500">{t('admin.campaigns.stats.paidUsers')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-2xl font-bold text-accent-400">{stats.conversion_rate}%</div>
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
                  {formatRubles(stats.balance_issued_kopeks)}
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
                {formatRubles(stats.avg_revenue_per_user_kopeks)}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.campaigns.stats.avgFirstPayment')}
              </div>
              <div className="text-lg font-medium text-dark-200">
                {formatRubles(stats.avg_first_payment_kopeks)}
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
            <svg
              className={`h-5 w-5 text-dark-400 transition-transform ${showUsers ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
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
                          {reg.first_name || reg.username || `User #${reg.user_id}`}
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
