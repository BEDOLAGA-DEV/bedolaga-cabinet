import apiClient from './client';

export type OpenIn = 'external' | 'webapp';

export interface MenuButtonConfig {
  id: string;
  type: 'builtin' | 'custom';
  style: 'primary' | 'success' | 'danger' | 'default';
  icon_custom_emoji_id: string;
  enabled: boolean;
  labels: Record<string, string>;
  url: string | null;
  open_in: OpenIn;
}

export interface MenuRowConfig {
  id: string;
  max_per_row: number;
  buttons: MenuButtonConfig[];
}

export interface MenuConfig {
  rows: MenuRowConfig[];
}

export const BOT_LOCALES = ['ru', 'en', 'ua', 'zh', 'fa'] as const;
export type BotLocale = (typeof BOT_LOCALES)[number];

export const BUILTIN_SECTIONS = [
  'home',
  'subscription',
  'balance',
  'referral',
  'support',
  'info',
  'admin',
  'language',
] as const;

export type BuiltinSection = (typeof BUILTIN_SECTIONS)[number];

export const STYLE_OPTIONS = [
  { value: 'default' as const, colorClass: 'bg-dark-500' },
  { value: 'primary' as const, colorClass: 'bg-blue-500' },
  { value: 'success' as const, colorClass: 'bg-success-500' },
  { value: 'danger' as const, colorClass: 'bg-red-500' },
];

const DEFAULT_CONFIG: MenuConfig = { rows: [] };

const DEFAULT_BUTTON: Omit<MenuButtonConfig, 'id' | 'type'> = {
  style: 'primary',
  icon_custom_emoji_id: '',
  enabled: true,
  labels: {},
  url: null,
  open_in: 'external',
};

function normalizeConfig(data: MenuConfig): MenuConfig {
  if (!data || typeof data !== 'object') {
    return DEFAULT_CONFIG;
  }
  return {
    rows: (data.rows || []).map((row) => ({
      id: row.id,
      max_per_row: row.max_per_row ?? 2,
      buttons: (row.buttons || []).map((btn) => ({
        ...DEFAULT_BUTTON,
        ...btn,
        labels: { ...(btn.labels || {}) },
      })),
    })),
  };
}

export const menuLayoutApi = {
  getConfig: async (): Promise<MenuConfig> => {
    const response = await apiClient.get<MenuConfig>('/cabinet/admin/menu-layout');
    return normalizeConfig(response.data);
  },

  updateConfig: async (config: MenuConfig): Promise<MenuConfig> => {
    const response = await apiClient.put<MenuConfig>('/cabinet/admin/menu-layout', config);
    return normalizeConfig(response.data);
  },

  resetConfig: async (): Promise<MenuConfig> => {
    const response = await apiClient.post<MenuConfig>('/cabinet/admin/menu-layout/reset');
    return normalizeConfig(response.data);
  },
};
