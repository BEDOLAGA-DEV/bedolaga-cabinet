import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingDefinition, adminSettingsApi } from '../../api/adminSettings';
import { StarIcon } from './icons';
import { SettingRow } from './SettingRow';

interface FavoritesTabProps {
  settings: SettingDefinition[];
  isFavorite: (key: string) => boolean;
  toggleFavorite: (key: string) => void;
}

export function FavoritesTab({ settings, isFavorite, toggleFavorite }: FavoritesTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminSettingsApi.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const resetSettingMutation = useMutation({
    mutationFn: (key: string) => adminSettingsApi.resetSetting(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  if (settings.length === 0) {
    return (
      <div className="rounded-2xl border border-dark-700/30 bg-dark-800/30 p-12 text-center">
        <div className="mb-4 flex justify-center text-dark-500">
          <StarIcon filled={false} />
        </div>
        <p className="text-dark-400">{t('admin.settings.favoritesEmpty')}</p>
        <p className="mt-1 text-sm text-dark-500">{t('admin.settings.favoritesHint')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {settings.map((setting) => (
        <SettingRow
          key={setting.key}
          setting={setting}
          isFavorite={isFavorite(setting.key)}
          onToggleFavorite={() => toggleFavorite(setting.key)}
          onUpdate={(value) => updateSettingMutation.mutate({ key: setting.key, value })}
          onReset={() => resetSettingMutation.mutate(setting.key)}
          isUpdating={updateSettingMutation.isPending}
          isResetting={resetSettingMutation.isPending}
        />
      ))}
    </div>
  );
}
