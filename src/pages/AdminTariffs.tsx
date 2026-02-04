import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tariffsApi, TariffListItem } from '../api/tariffs';
import { useDestructiveConfirm, useNotify } from '@/platform';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

// Icons
const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const GiftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

// BackIcon
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

export default function AdminTariffs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmDelete = useDestructiveConfirm();
  const notify = useNotify();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  // Queries
  const { data: tariffsData, isLoading } = useQuery({
    queryKey: ['admin-tariffs'],
    queryFn: () => tariffsApi.getTariffs(true),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: tariffsApi.deleteTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      notify.success(t('admin.tariffs.deleteSuccess'));
    },
  });

  const handleDelete = async (tariff: TariffListItem) => {
    // If tariff has active subscriptions, show warning but still allow deletion
    const confirmText =
      tariff.subscriptions_count > 0
        ? t('admin.tariffs.confirmDeleteWithSubscriptions', {
            count: tariff.subscriptions_count,
          })
        : t('admin.tariffs.confirmDeleteText');

    const confirmed = await confirmDelete(
      confirmText,
      t('common.delete'),
      t('admin.tariffs.confirmDelete'),
    );

    if (confirmed) {
      deleteMutation.mutate(tariff.id);
    }
  };

  const toggleMutation = useMutation({
    mutationFn: tariffsApi.toggleTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
    },
  });

  const toggleTrialMutation = useMutation({
    mutationFn: tariffsApi.toggleTrial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
    },
  });

  const tariffs = tariffsData?.tariffs || [];

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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.tariffs.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.tariffs.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/tariffs/create')}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
        >
          <PlusIcon />
          {t('admin.tariffs.create')}
        </button>
      </div>

      {/* Tariffs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : tariffs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.tariffs.noTariffs')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tariffs.map((tariff: TariffListItem) => (
            <div
              key={tariff.id}
              className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                tariff.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate font-medium text-dark-100">{tariff.name}</h3>
                    {tariff.is_daily ? (
                      <span className="rounded bg-warning-500/20 px-2 py-0.5 text-xs text-warning-400">
                        {t('admin.tariffs.dailyType')}
                      </span>
                    ) : (
                      <span className="rounded bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
                        {t('admin.tariffs.periodType')}
                      </span>
                    )}
                    {tariff.is_trial_available && (
                      <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                        {t('admin.tariffs.trial')}
                      </span>
                    )}
                    {!tariff.is_active && (
                      <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                        {t('admin.tariffs.inactive')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    {tariff.is_daily && tariff.daily_price_kopeks > 0 && (
                      <span className="text-warning-400">
                        {(tariff.daily_price_kopeks / 100).toFixed(2)}{' '}
                        {t('admin.tariffs.currencyPerDay')}
                      </span>
                    )}
                    <span>
                      {tariff.traffic_limit_gb === 0
                        ? t('admin.tariffs.unlimited')
                        : `${tariff.traffic_limit_gb} GB`}
                    </span>
                    <span>{t('admin.tariffs.devices', { count: tariff.device_limit })}</span>
                    <span>{t('admin.tariffs.servers', { count: tariff.servers_count })}</span>
                    <span>
                      {t('admin.tariffs.subscriptions', { count: tariff.subscriptions_count })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Active */}
                  <button
                    onClick={() => toggleMutation.mutate(tariff.id)}
                    className={`rounded-lg p-2 transition-colors ${
                      tariff.is_active
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={
                      tariff.is_active ? t('admin.tariffs.deactivate') : t('admin.tariffs.activate')
                    }
                  >
                    {tariff.is_active ? <CheckIcon /> : <XIcon />}
                  </button>

                  {/* Toggle Trial */}
                  <button
                    onClick={() => toggleTrialMutation.mutate(tariff.id)}
                    className={`rounded-lg p-2 transition-colors ${
                      tariff.is_trial_available
                        ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={t('admin.tariffs.toggleTrial')}
                  >
                    <GiftIcon />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => navigate(`/admin/tariffs/${tariff.id}/edit`)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                    title={t('admin.tariffs.edit')}
                  >
                    <EditIcon />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(tariff)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-error-500/20 hover:text-error-400"
                    title={t('admin.tariffs.delete')}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
