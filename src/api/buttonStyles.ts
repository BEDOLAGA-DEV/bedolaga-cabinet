import apiClient from './client';

export interface ButtonSectionConfig {
  style: 'primary' | 'success' | 'danger' | 'default';
  icon_custom_emoji_id: string;
  enabled: boolean;
  labels: Record<string, string>;
}

export interface ButtonStylesConfig {
  home: ButtonSectionConfig;
  subscription: ButtonSectionConfig;
  balance: ButtonSectionConfig;
  referral: ButtonSectionConfig;
  support: ButtonSectionConfig;
  info: ButtonSectionConfig;
  admin: ButtonSectionConfig;
}

export type ButtonStylesUpdate = {
  [K in keyof ButtonStylesConfig]?: Partial<ButtonSectionConfig>;
};

export const BUTTON_SECTIONS = [
  'home',
  'subscription',
  'balance',
  'referral',
  'support',
  'info',
  'admin',
] as const;

export type ButtonSection = (typeof BUTTON_SECTIONS)[number];

// Bot-side locales (includes 'ua' for Ukrainian, mapped from ISO 'uk' internally).
export const BOT_LOCALES = ['ru', 'en', 'ua', 'zh', 'fa'] as const;

export type BotLocale = (typeof BOT_LOCALES)[number];

const DEFAULT_SECTION: ButtonSectionConfig = {
  style: 'primary',
  icon_custom_emoji_id: '',
  enabled: true,
  labels: {},
};

export const DEFAULT_BUTTON_STYLES: ButtonStylesConfig = {
  home: { ...DEFAULT_SECTION, style: 'primary' },
  subscription: { ...DEFAULT_SECTION, style: 'success' },
  balance: { ...DEFAULT_SECTION, style: 'primary' },
  referral: { ...DEFAULT_SECTION, style: 'success' },
  support: { ...DEFAULT_SECTION, style: 'primary' },
  info: { ...DEFAULT_SECTION, style: 'primary' },
  admin: { ...DEFAULT_SECTION, style: 'danger' },
};

function normalizeConfig(data: ButtonStylesConfig): ButtonStylesConfig {
  const result = {} as ButtonStylesConfig;
  for (const section of BUTTON_SECTIONS) {
    result[section] = {
      ...DEFAULT_SECTION,
      ...data[section],
      labels: { ...(data[section]?.labels || {}) },
    };
  }
  return result;
}

export const buttonStylesApi = {
  getStyles: async (): Promise<ButtonStylesConfig> => {
    try {
      const response = await apiClient.get<ButtonStylesConfig>('/cabinet/admin/button-styles');
      return normalizeConfig(response.data);
    } catch {
      return DEFAULT_BUTTON_STYLES;
    }
  },

  updateStyles: async (update: ButtonStylesUpdate): Promise<ButtonStylesConfig> => {
    const response = await apiClient.patch<ButtonStylesConfig>(
      '/cabinet/admin/button-styles',
      update,
    );
    return normalizeConfig(response.data);
  },

  resetStyles: async (): Promise<ButtonStylesConfig> => {
    const response = await apiClient.post<ButtonStylesConfig>('/cabinet/admin/button-styles/reset');
    return normalizeConfig(response.data);
  },
};
