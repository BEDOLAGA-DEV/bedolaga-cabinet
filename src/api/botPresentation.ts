import apiClient from './client';

export interface BotPresentationConfig {
  version: number;
  emoji_overrides: Record<string, string>;
  text_overrides: Record<string, string>;
  emoji_catalog_count: number;
  text_catalog_count: number;
}

export interface EmojiCatalogItem {
  token: string;
  localization_key: string;
  occurrence: number;
  glyph: string;
  custom_emoji_id: string;
  usage_count: number;
  usages: string[];
}

export interface TextCatalogItem {
  key: string;
  default: string;
  override: string;
  usage_count: number;
  usages: string[];
}

export interface CatalogResponse<T> {
  kind: 'emoji' | 'text';
  total: number;
  offset: number;
  limit: number;
  items: T[];
}

export interface BotPresentationUpdate {
  emoji_overrides: Record<string, string>;
  text_overrides: Record<string, string>;
}

export const botPresentationApi = {
  getConfig: async (): Promise<BotPresentationConfig> => {
    const response = await apiClient.get<BotPresentationConfig>('/cabinet/admin/bot-presentation');
    return response.data;
  },

  getEmojiCatalog: async (
    query: string,
    offset: number,
    limit = 100,
  ): Promise<CatalogResponse<EmojiCatalogItem>> => {
    const response = await apiClient.get<CatalogResponse<EmojiCatalogItem>>(
      '/cabinet/admin/bot-presentation/catalog',
      { params: { kind: 'emoji', query, offset, limit } },
    );
    return response.data;
  },

  getTextCatalog: async (
    query: string,
    offset: number,
    limit = 100,
  ): Promise<CatalogResponse<TextCatalogItem>> => {
    const response = await apiClient.get<CatalogResponse<TextCatalogItem>>(
      '/cabinet/admin/bot-presentation/catalog',
      { params: { kind: 'text', query, offset, limit } },
    );
    return response.data;
  },

  updateConfig: async (payload: BotPresentationUpdate): Promise<BotPresentationConfig> => {
    const response = await apiClient.put<BotPresentationConfig>(
      '/cabinet/admin/bot-presentation',
      payload,
    );
    return response.data;
  },

  resetConfig: async (): Promise<BotPresentationConfig> => {
    const response = await apiClient.post<BotPresentationConfig>(
      '/cabinet/admin/bot-presentation/reset',
    );
    return response.data;
  },
};
