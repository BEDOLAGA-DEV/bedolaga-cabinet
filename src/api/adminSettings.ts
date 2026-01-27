import apiClient from './client';

export interface SettingCategoryRef {
  key: string;
  label: string;
}

export interface SettingCategorySummary {
  key: string;
  label: string;
  description: string;
  items: number;
}

export interface SettingChoice {
  value: unknown;
  label: string;
  description?: string | null;
}

export interface SettingHint {
  description: string;
  format: string;
  example: string;
  warning: string;
}

export interface SettingDefinition {
  key: string;
  name: string;
  category: SettingCategoryRef;
  type: string;
  is_optional: boolean;
  current: unknown;
  original: unknown;
  has_override: boolean;
  read_only: boolean;
  choices: SettingChoice[];
  hint?: SettingHint | null;
}

export const adminSettingsApi = {
  // Get list of setting categories
  getCategories: async (): Promise<SettingCategorySummary[]> => {
    const response = await apiClient.get<SettingCategorySummary[]>(
      '/cabinet/admin/settings/categories',
    );
    return response.data;
  },

  // Get all settings or settings for a specific category
  getSettings: async (categoryKey?: string): Promise<SettingDefinition[]> => {
    const params = categoryKey ? { category_key: categoryKey } : {};
    const response = await apiClient.get<SettingDefinition[]>('/cabinet/admin/settings', {
      params,
    });
    return response.data;
  },

  // Get a specific setting by key
  getSetting: async (key: string): Promise<SettingDefinition> => {
    const response = await apiClient.get<SettingDefinition>(`/cabinet/admin/settings/${key}`);
    return response.data;
  },

  // Update a setting value
  updateSetting: async (key: string, value: unknown): Promise<SettingDefinition> => {
    const response = await apiClient.put<SettingDefinition>(`/cabinet/admin/settings/${key}`, {
      value,
    });
    return response.data;
  },

  // Reset a setting to default
  resetSetting: async (key: string): Promise<SettingDefinition> => {
    const response = await apiClient.delete<SettingDefinition>(`/cabinet/admin/settings/${key}`);
    return response.data;
  },
};
