import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { serversApi, ServerListItem } from '../api/servers';
import { SyncIcon, EditIcon, CheckIcon, XIcon, UsersIcon, GiftIcon } from '../components/icons';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

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

// Country flags (simple emoji mapping)
const getCountryFlag = (code: string | null): string => {
  if (!code) return '';
  const codeMap: Record<string, string> = {
    RU: '🇷🇺',
    US: '🇺🇸',
    DE: '🇩🇪',
    NL: '🇳🇱',
    GB: '🇬🇧',
    FR: '🇫🇷',
    FI: '🇫🇮',
    SE: '🇸🇪',
    PL: '🇵🇱',
    CZ: '🇨🇿',
    AT: '🇦🇹',
    CH: '🇨🇭',
    UA: '🇺🇦',
    KZ: '🇰🇿',
    JP: '🇯🇵',
    KR: '🇰🇷',
    SG: '🇸🇬',
    HK: '🇭🇰',
    CA: '🇨🇦',
    AU: '🇦🇺',
    BR: '🇧🇷',
    IN: '🇮🇳',
    TR: '🇹🇷',
    IL: '🇮🇱',
    AE: '🇦🇪',
  };
  return codeMap[code.toUpperCase()] || code;
};

export default function AdminServers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  // Queries
  const { data: serversData, isLoading } = useQuery({
    queryKey: ['admin-servers'],
    queryFn: () => serversApi.getServers(true),
  });

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: serversApi.toggleServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] });
    },
  });

  const toggleTrialMutation = useMutation({
    mutationFn: serversApi.toggleTrial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: serversApi.syncServers,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] });
      alert(result.message);
    },
  });

  const servers = serversData?.servers || [];

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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.servers.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.servers.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
        >
          <SyncIcon />
          {syncMutation.isPending ? t('admin.servers.syncing') : t('admin.servers.sync')}
        </button>
      </div>

      {/* Servers List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : servers.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.servers.noServers')}</p>
          <button
            onClick={() => syncMutation.mutate()}
            className="mt-4 text-accent-400 hover:text-accent-300"
          >
            {t('admin.servers.syncNow')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server: ServerListItem) => (
            <div
              key={server.id}
              className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                server.is_available ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-lg">{getCountryFlag(server.country_code)}</span>
                    <h3 className="truncate font-medium text-dark-100">{server.display_name}</h3>
                    {server.is_trial_eligible && (
                      <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                        {t('admin.servers.trial')}
                      </span>
                    )}
                    {!server.is_available && (
                      <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                        {t('admin.servers.unavailable')}
                      </span>
                    )}
                    {server.is_full && (
                      <span className="rounded bg-warning-500/20 px-2 py-0.5 text-xs text-warning-400">
                        {t('admin.servers.full')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-4 w-4" />
                      {server.current_users}
                      {server.max_users ? ` / ${server.max_users}` : ''}
                    </span>
                    <span>{server.price_rubles} ₽</span>
                    <span className="max-w-[200px] truncate font-mono text-xs text-dark-500">
                      {server.squad_uuid}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Available */}
                  <button
                    onClick={() => toggleMutation.mutate(server.id)}
                    className={`rounded-lg p-2 transition-colors ${
                      server.is_available
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={
                      server.is_available ? t('admin.servers.disable') : t('admin.servers.enable')
                    }
                  >
                    {server.is_available ? <CheckIcon /> : <XIcon />}
                  </button>

                  {/* Toggle Trial */}
                  <button
                    onClick={() => toggleTrialMutation.mutate(server.id)}
                    className={`rounded-lg p-2 transition-colors ${
                      server.is_trial_eligible
                        ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={t('admin.servers.toggleTrial')}
                  >
                    <GiftIcon />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => navigate(`/admin/servers/${server.id}/edit`)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                    title={t('admin.servers.edit')}
                  >
                    <EditIcon />
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
