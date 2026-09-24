import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminBroadcastsApi, type BroadcastChannel } from '../api/adminBroadcasts';
import { AdminBackButton } from '../components/admin';
import {
  BroadcastDeliveryStats,
  BroadcastStatusBadge,
} from '../components/broadcasts/BroadcastDeliveryStats';
import { broadcastPollInterval, isBroadcastInFlight } from '../utils/broadcastStatus';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import {
  DocumentIcon,
  EmailIcon,
  PhotoIcon,
  RefreshIcon,
  StopIcon,
  TelegramIcon,
  VideoIcon,
} from '@/components/icons';

// Channel badge component
function ChannelBadge({ channel }: { channel?: BroadcastChannel }) {
  if (!channel || channel === 'telegram') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
        <TelegramIcon />
        <span className="hidden sm:inline">Telegram</span>
      </span>
    );
  }

  if (channel === 'email') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
        <EmailIcon />
        <span className="hidden sm:inline">Email</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
      <TelegramIcon />
      <span className="mx-0.5">+</span>
      <EmailIcon />
    </span>
  );
}

export default function AdminBroadcastDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const broadcastId = id ? parseInt(id, 10) : null;

  // Fetch broadcast details
  const {
    data: broadcast,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'broadcasts', 'detail', broadcastId],
    queryFn: async () => {
      if (!broadcastId) throw new Error('Invalid broadcast ID');
      return adminBroadcastsApi.get(broadcastId);
    },
    enabled: !!broadcastId && !Number.isNaN(broadcastId),
    refetchInterval: (query) => broadcastPollInterval(query.state.data?.status),
  });

  const { data: audienceFilters } = useQuery({
    queryKey: ['admin', 'broadcasts', 'detail-filters', broadcast?.channel],
    queryFn: async () => {
      if (broadcast?.channel !== 'email') return adminBroadcastsApi.getFilters();
      const [emailFilters, tariffs] = await Promise.all([
        adminBroadcastsApi.getEmailFilters(),
        adminBroadcastsApi.getTariffs(),
      ]);
      return {
        filters: emailFilters.filters,
        tariff_filters: tariffs.tariffs.map((tariff) => ({
          key: tariff.filter_key,
          label: tariff.name,
          tariff_id: tariff.id,
          count: tariff.active_users_count,
        })),
        custom_filters: [],
      };
    },
    enabled: !!broadcast?.audience,
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: adminBroadcastsApi.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      refetch();
    },
  });

  const isRunning = broadcast && isBroadcastInFlight(broadcast.status);

  if (!broadcastId || Number.isNaN(broadcastId)) {
    navigate('/admin/broadcasts');
    return null;
  }

  if (isLoading) {
    return (
      <PageSkeleton variant="admin" leading={1} titleWidth="w-56" className="space-y-6">
        <Skeleton variant="card" count={2} className="h-40" />
      </PageSkeleton>
    );
  }

  if (!broadcast) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-dark-400">{t('admin.broadcasts.notFound')}</p>
        <button
          onClick={() => navigate('/admin/broadcasts')}
          className="rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
          <AdminBackButton to="/admin/broadcasts" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-bold text-dark-100">
                {t('admin.broadcasts.detail')} #{broadcast.id}
              </h1>
              <BroadcastStatusBadge status={broadcast.status} />
              <ChannelBadge channel={broadcast.channel} />
            </div>
            <p className="text-sm text-dark-400">
              {new Date(broadcast.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-lg p-2 transition-colors hover:bg-dark-700"
        >
          <RefreshIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Progress + stats */}
      <BroadcastDeliveryStats
        status={broadcast.status}
        progressPercent={broadcast.progress_percent}
        totalCount={broadcast.total_count}
        sentCount={broadcast.sent_count}
        blockedCount={broadcast.blocked_count}
        failedCount={broadcast.failed_count}
      />

      {/* Target */}
      <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
        <p className="mb-1 text-sm text-dark-400">{t('admin.broadcasts.filter')}</p>
        {broadcast.audience ? (
          <div className="space-y-2 text-sm text-dark-100">
            {broadcast.audience.conditions.map((condition, index) => {
              const filters = [
                ...(audienceFilters?.filters || []),
                ...(audienceFilters?.tariff_filters || []),
                ...(audienceFilters?.custom_filters || []),
              ];
              const label =
                condition.label ||
                filters.find((filter) => filter.key === condition.value)?.label ||
                (
                  {
                    active: t('admin.broadcasts.atomic.active', 'Активна'),
                    expired: t('admin.broadcasts.atomic.expired', 'Истекла'),
                    trial: t('admin.broadcasts.atomic.trial', 'Триальная'),
                    paid: t('admin.broadcasts.atomic.paid', 'Оплаченная'),
                    zero: '0 ГБ',
                    yes: t('common.yes', 'Да'),
                    no: t('common.no', 'Нет'),
                    custom_referrals: t('admin.broadcasts.atomic.referral', 'По рефералу'),
                    custom_direct: t('admin.broadcasts.atomic.direct', 'Напрямую'),
                    email_only: 'Email',
                    telegram_with_email: 'Telegram',
                    expiring: t('admin.broadcasts.atomic.next3Days', 'В ближайшие 3 дня'),
                    custom_today: t('admin.broadcasts.atomic.today', 'Сегодня'),
                    custom_week: t('admin.broadcasts.atomic.last7Days', 'За 7 дней'),
                    custom_month: t('admin.broadcasts.atomic.last30Days', 'За 30 дней'),
                    custom_active_today: t(
                      'admin.broadcasts.atomic.activeToday',
                      'Активен сегодня',
                    ),
                    custom_inactive_week: t(
                      'admin.broadcasts.atomic.inactive7Days',
                      'Неактивен 7+ дней',
                    ),
                    custom_inactive_month: t(
                      'admin.broadcasts.atomic.inactive30Days',
                      'Неактивен 30+ дней',
                    ),
                  } as Record<string, string>
                )[condition.value] ||
                condition.value;
              const atomicFields: Record<string, string> = {
                subscription_status: t(
                  'admin.broadcasts.atomic.subscriptionStatus',
                  'Статус подписки',
                ),
                subscription_type: t('admin.broadcasts.atomic.subscriptionType', 'Тип подписки'),
                traffic_zero: t(
                  'admin.broadcasts.atomic.trafficZero',
                  'Использованный трафик равен 0',
                ),
                traffic_gt: t('admin.broadcasts.atomic.trafficGt', 'Использованный трафик больше'),
                traffic_lt: t('admin.broadcasts.atomic.trafficLt', 'Использованный трафик меньше'),
                subscription_end_date: t(
                  'admin.broadcasts.atomic.endDate',
                  'Окончание подписки: дата',
                ),
                registration_date: t(
                  'admin.broadcasts.atomic.registrationDate',
                  'Дата регистрации',
                ),
                activity_date: t(
                  'admin.broadcasts.atomic.activityDate',
                  'Последняя активность: дата',
                ),
                paid_history: t('admin.broadcasts.atomic.paidHistory', 'Оплачивал раньше'),
                subscription_end_preset: t(
                  'admin.broadcasts.atomic.endPreset',
                  'Окончание подписки: быстрый период',
                ),
                registration: t(
                  'admin.broadcasts.atomic.registrationPreset',
                  'Регистрация: быстрый период',
                ),
                activity: t('admin.broadcasts.atomic.activityPreset', 'Активность: быстрый период'),
                source: t('admin.broadcasts.atomic.source', 'Источник регистрации'),
                telegram_id: 'Telegram ID',
                telegram_username: t('admin.broadcasts.atomic.telegramUsername', 'Ник Telegram'),
                email_user: 'Email',
              };
              const fieldLabel =
                atomicFields[condition.field] ||
                (condition.field === 'auth_type'
                  ? t('admin.broadcasts.audience.authType')
                  : t(`admin.broadcasts.filterGroups.${condition.field}`, condition.field));
              const comparison = {
                eq: t('admin.broadcasts.audience.equals'),
                ne: t('admin.broadcasts.audience.notEquals'),
                before: t('admin.broadcasts.atomic.before', 'До даты'),
                after: t('admin.broadcasts.atomic.after', 'После даты'),
                between: t('admin.broadcasts.atomic.between', 'Между датами'),
              }[condition.operator];
              return (
                <div key={index}>
                  {index > 0 && (
                    <strong className="mr-2 text-accent-400">
                      {condition.join === 'or'
                        ? t('admin.broadcasts.audience.or')
                        : t('admin.broadcasts.audience.and')}
                    </strong>
                  )}
                  {condition.field === 'traffic_zero' ? (
                    fieldLabel
                  ) : (
                    <>
                      {fieldLabel}{' '}
                      {['traffic_gt', 'traffic_lt'].includes(condition.field) ? '' : comparison}{' '}
                      {label}
                      {['traffic_gt', 'traffic_lt'].includes(condition.field) ? ' ГБ' : ''}
                      {condition.value_to ? ` – ${condition.value_to}` : ''}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-medium text-dark-100">{broadcast.target_type}</p>
        )}
      </div>

      {/* Telegram Message */}
      {broadcast.message_text && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm text-dark-400">
            <TelegramIcon />
            {t('admin.broadcasts.message')}
          </p>
          <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-dark-700/50 p-4 text-dark-100">
            {broadcast.message_text}
          </div>
        </div>
      )}

      {/* Email Subject */}
      {broadcast.email_subject && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm text-dark-400">
            <EmailIcon />
            {t('admin.broadcasts.emailSubject')}
          </p>
          <div className="rounded-lg bg-dark-700/50 p-4 text-dark-100">
            {broadcast.email_subject}
          </div>
        </div>
      )}

      {/* Email Content */}
      {broadcast.email_html_content && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="mb-2 text-sm text-dark-400">{t('admin.broadcasts.emailContent')}</p>
          <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-dark-700/50 p-4 font-mono text-xs text-dark-100">
            {broadcast.email_html_content}
          </div>
        </div>
      )}

      {/* Media */}
      {broadcast.has_media && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="mb-2 text-sm text-dark-400">{t('admin.broadcasts.media')}</p>
          <div className="flex items-center gap-3 text-dark-100">
            {broadcast.media_type === 'photo' && <PhotoIcon />}
            {broadcast.media_type === 'video' && <VideoIcon />}
            {broadcast.media_type === 'document' && <DocumentIcon />}
            <span className="capitalize">{broadcast.media_type}</span>
          </div>
        </div>
      )}

      {/* Admin info */}
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-xl border border-dark-700 bg-dark-800/50 p-4 text-sm">
        <span className="min-w-0 text-dark-400 [overflow-wrap:anywhere]">
          {t('admin.broadcasts.createdBy')}:{' '}
          <span className="text-dark-100">
            {broadcast.admin_name || t('admin.broadcasts.unknownAdmin')}
          </span>
        </span>
        <span className="whitespace-nowrap text-dark-400">
          {new Date(broadcast.created_at).toLocaleString()}
        </span>
      </div>

      {/* Stop button */}
      {isRunning && broadcast.status !== 'cancelling' && (
        <button
          onClick={() => stopMutation.mutate(broadcast.id)}
          disabled={stopMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-error-500/30 bg-error-500/20 px-4 py-2 text-sm text-error-400 transition-colors hover:bg-error-500/30 disabled:opacity-50"
        >
          <StopIcon />
          {stopMutation.isPending ? t('admin.broadcasts.stopping') : t('admin.broadcasts.stop')}
        </button>
      )}
    </div>
  );
}
