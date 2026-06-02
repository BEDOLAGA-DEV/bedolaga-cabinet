import apiClient from './client';

export interface LocalizedText {
  en: string;
  ru: string;
  zh?: string;
  fa?: string;
  fr?: string;
}

export const adminAppsApi = {
  // Get Remnawave config status
  getRemnaWaveStatus: async (): Promise<{ enabled: boolean; config_uuid: string | null }> => {
    const response = await apiClient.get<{ enabled: boolean; config_uuid: string | null }>(
      '/cabinet/admin/apps/remnawave/status',
    );
    return response.data;
  },

  // Set Remnawave config UUID
  setRemnaWaveUuid: async (
    uuid: string | null,
  ): Promise<{ enabled: boolean; config_uuid: string | null }> => {
    const response = await apiClient.put<{ enabled: boolean; config_uuid: string | null }>(
      '/cabinet/admin/apps/remnawave/uuid',
      { uuid },
    );
    return response.data;
  },

  // List available Remnawave configs
  listRemnaWaveConfigs: async (): Promise<
    { uuid: string; name: string; view_position: number }[]
  > => {
    const response = await apiClient.get<{ uuid: string; name: string; view_position: number }[]>(
      '/cabinet/admin/apps/remnawave/configs',
    );
    return response.data;
  },

  // Get Remnawave subscription config
  getRemnaWaveConfig: async (): Promise<RemnawaveConfig> => {
    const response = await apiClient.get<{
      uuid: string;
      name: string;
      view_position: number;
      config: RemnawaveConfig;
    }>('/cabinet/admin/apps/remnawave/config');
    return response.data.config;
  },
};

// ============== Remnawave Format Types ==============

export interface RemnawaveButton {
  url: string;
  text: LocalizedText;
  type?: 'external' | 'subscriptionLink' | 'copyButton';
  svgIconKey?: string;
}

export interface RemnawaveBlock {
  title: LocalizedText;
  description: LocalizedText;
  buttons?: RemnawaveButton[];
  svgIconKey?: string;
  svgIconColor?: string;
}

export interface RemnawaveApp {
  name: string;
  featured?: boolean;
  urlScheme?: string;
  isNeedBase64Encoding?: boolean;
  svgIconKey?: string;
  blocks: RemnawaveBlock[];
}

export interface RemnawavePlatform {
  svgIconKey?: string;
  apps: RemnawaveApp[];
}

export interface RemnawaveSvgItem {
  svgString: string;
  tags?: string[];
}

export interface RemnawaveBaseSettings {
  isShowTutorialButton: boolean;
  tutorialUrl: string;
}

export interface RemnawaveBaseTranslations {
  installApp: LocalizedText;
  addSubscription: LocalizedText;
  connectAndUse: LocalizedText;
  copyLink: LocalizedText;
  openApp: LocalizedText;
  tutorial: LocalizedText;
  close: LocalizedText;
}

export interface RemnawaveBrandingSettings {
  name: string;
  logoUrl: string;
  supportUrl: string;
}

export interface RemnawaveConfig {
  platforms: Record<string, RemnawavePlatform>;
  svgLibrary?: Record<string, RemnawaveSvgItem>;
  baseSettings?: RemnawaveBaseSettings;
  baseTranslations?: RemnawaveBaseTranslations;
  brandingSettings?: RemnawaveBrandingSettings;
}
