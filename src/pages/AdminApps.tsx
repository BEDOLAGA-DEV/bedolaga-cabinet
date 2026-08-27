import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminAppsApi } from '../api/adminApps';
import { usePlatform } from '../platform/hooks/usePlatform';
import { BackIcon } from '@/components/icons';

export default function AdminApps() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Remnawave status
  const { data: status } = useQuery({
    queryKey: ['remnawave-status'],
    queryFn: adminAppsApi.getRemnaWaveStatus,
    staleTime: 60000,
  });

  // Available configs
  const { data: configs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['remnawave-configs-list'],
    queryFn: adminAppsApi.listRemnaWaveConfigs,
    staleTime: 30000,
  });

  // Set UUID mutation
  const setUuidMutation = useMutation({
    mutationFn: adminAppsApi.setRemnaWaveUuid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remnawave-status'] });
      queryClient.invalidateQueries({ queryKey: ['remnawave-config'] });
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
    },
  });

  const currentUuid = status?.config_uuid || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {!capabilities.hasBackButton && (
          <button
            onClick={() => navigate('/admin')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon className="h-5 w-5 text-dark-400" />
          </button>
        )}
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('admin.apps.title')}</h1>
      </div>

      {/* Status card */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${status?.enabled ? 'bg-success-400' : 'bg-dark-600'}`}
          />
          <span className="text-sm font-medium text-dark-200">
            {status?.enabled
              ? t('admin.apps.remnaWaveConnected', 'Remnawave connected')
              : t('admin.apps.remnaWaveDisconnected', 'Remnawave not connected')}
          </span>
        </div>
        {status?.config_uuid && (
          <div className="mt-2 truncate font-mono text-xs text-dark-500">
            UUID: {status.config_uuid}
          </div>
        )}
      </div>

      {/* Available configs */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-dark-300">
          {t('admin.apps.availableConfigs', 'Available configs')}
        </h2>
        {isLoadingConfigs ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="space-y-2">
            {configs.map((config) => (
              <button
                key={config.uuid}
                onClick={() => {
                  if (config.uuid !== currentUuid) {
                    setUuidMutation.mutate(config.uuid);
                  }
                }}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  currentUuid === config.uuid
                    ? 'border-accent-500 bg-accent-500/10'
                    : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                }`}
              >
                <div className="font-medium text-dark-100">{config.name}</div>
                <div className="mt-1 font-mono text-xs text-dark-500">{config.uuid}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card py-8 text-center text-sm text-dark-500">
            {t('admin.apps.noConfigs', 'No configs available')}
          </div>
        )}
      </div>
    </div>
  );
}
