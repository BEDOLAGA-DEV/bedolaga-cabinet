import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingDefinition, adminSettingsApi } from '../../api/adminSettings';
import { ChevronDownIcon } from './icons';
import { SettingRow } from './SettingRow';

interface CategoryGroup {
  key: string;
  label: string;
  settings: SettingDefinition[];
}

interface SettingsTabProps {
  categories: CategoryGroup[];
  searchQuery: string;
  filteredSettings: SettingDefinition[];
  isFavorite: (key: string) => boolean;
  toggleFavorite: (key: string) => void;
}

export function SettingsTab({
  categories,
  searchQuery,
  filteredSettings,
  isFavorite,
  toggleFavorite,
}: SettingsTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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

  // If searching, show flat list
  if (searchQuery) {
    return (
      <div className="space-y-4">
        {filteredSettings.length === 0 ? (
          <div className="rounded-2xl border border-dark-700/30 bg-dark-800/30 p-12 text-center">
            <p className="text-dark-400">{t('admin.settings.noSettings')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredSettings.map((setting) => (
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
        )}
      </div>
    );
  }

  // Show accordion for subcategories
  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const isExpanded = expandedSections.has(cat.key);
        return (
          <div
            key={cat.key}
            className="overflow-hidden rounded-2xl border border-dark-700/30 bg-dark-800/30"
          >
            {/* Accordion header */}
            <button
              onClick={() => toggleSection(cat.key)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-dark-800/50"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-dark-100">{cat.label}</span>
                <span className="rounded-full bg-dark-700 px-2 py-0.5 text-xs text-dark-400">
                  {cat.settings.length}
                </span>
              </div>
              <div
                className={`text-dark-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              >
                <ChevronDownIcon />
              </div>
            </button>

            {/* Accordion content */}
            {isExpanded && (
              <div className="border-t border-dark-700/30 p-4 pt-0">
                <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
                  {cat.settings.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      isFavorite={isFavorite(setting.key)}
                      onToggleFavorite={() => toggleFavorite(setting.key)}
                      onUpdate={(value) =>
                        updateSettingMutation.mutate({ key: setting.key, value })
                      }
                      onReset={() => resetSettingMutation.mutate(setting.key)}
                      isUpdating={updateSettingMutation.isPending}
                      isResetting={resetSettingMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {categories.length === 0 && (
        <div className="rounded-2xl border border-dark-700/30 bg-dark-800/30 p-12 text-center">
          <p className="text-dark-400">{t('admin.settings.noSettings')}</p>
        </div>
      )}
    </div>
  );
}
