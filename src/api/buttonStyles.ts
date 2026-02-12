import apiClient from './client';

export interface ButtonSectionConfig {
  style: 'primary' | 'success' | 'danger';
  icon_custom_emoji_id: string;
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

export const DEFAULT_BUTTON_STYLES: ButtonStylesConfig = {
  home: { style: 'primary', icon_custom_emoji_id: '' },
  subscription: { style: 'success', icon_custom_emoji_id: '' },
  balance: { style: 'primary', icon_custom_emoji_id: '' },
  referral: { style: 'success', icon_custom_emoji_id: '' },
  support: { style: 'primary', icon_custom_emoji_id: '' },
  info: { style: 'primary', icon_custom_emoji_id: '' },
  admin: { style: 'danger', icon_custom_emoji_id: '' },
};

export const buttonStylesApi = {
  getStyles: async (): Promise<ButtonStylesConfig> => {
    try {
      const response = await apiClient.get<ButtonStylesConfig>('/cabinet/admin/button-styles');
      return response.data;
    } catch {
      return DEFAULT_BUTTON_STYLES;
    }
  },

  updateStyles: async (update: ButtonStylesUpdate): Promise<ButtonStylesConfig> => {
    const response = await apiClient.patch<ButtonStylesConfig>(
      '/cabinet/admin/button-styles',
      update,
    );
    return response.data;
  },

  resetStyles: async (): Promise<ButtonStylesConfig> => {
    const response = await apiClient.post<ButtonStylesConfig>('/cabinet/admin/button-styles/reset');
    return response.data;
  },
};
