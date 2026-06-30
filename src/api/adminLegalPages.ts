import apiClient from './client';
import type { InfoPageDisplayMode } from './infoPages';

export type LegalDisplayMode = InfoPageDisplayMode;

export interface LegalDocumentItem {
  language: string;
  content: string;
  is_enabled: boolean;
  updated_at: string | null;
}

export interface LegalDocumentResponse {
  display_mode: LegalDisplayMode;
  display_mode_env_locked: boolean;
  items: LegalDocumentItem[];
}

export interface LegalDocumentUpdateRequest {
  display_mode?: LegalDisplayMode;
  items?: Array<{ language: string; content: string; is_enabled: boolean }>;
}

export interface RulesItem {
  language: string;
  content: string;
  updated_at: string | null;
}

export interface AdminRulesResponse {
  display_mode: LegalDisplayMode;
  display_mode_env_locked: boolean;
  items: RulesItem[];
}

export interface RulesUpdateRequest {
  display_mode?: LegalDisplayMode;
  items?: Array<{ language: string; content: string }>;
}

export interface FaqSettingItem {
  language: string;
  is_enabled: boolean;
}

export interface FaqPageItem {
  id: number;
  language: string;
  title: string;
  content: string;
  display_order: number;
  is_active: boolean;
  updated_at: string | null;
}

export interface FaqResponse {
  display_mode: LegalDisplayMode;
  display_mode_env_locked: boolean;
  settings: FaqSettingItem[];
  pages: FaqPageItem[];
}

export interface FaqUpdateRequest {
  display_mode?: LegalDisplayMode;
  settings?: FaqSettingItem[];
}

export interface FaqPageCreateRequest {
  language: string;
  title: string;
  content: string;
  display_order?: number;
  is_active?: boolean;
}

export interface FaqPageUpdateRequest {
  title?: string;
  content?: string;
  display_order?: number;
  is_active?: boolean;
}

export const adminLegalPagesApi = {
  getPrivacyPolicy: async (): Promise<LegalDocumentResponse> => {
    const response = await apiClient.get<LegalDocumentResponse>(
      '/cabinet/admin/legal-pages/privacy-policy',
    );
    return response.data;
  },

  updatePrivacyPolicy: async (data: LegalDocumentUpdateRequest): Promise<LegalDocumentResponse> => {
    const response = await apiClient.put<LegalDocumentResponse>(
      '/cabinet/admin/legal-pages/privacy-policy',
      data,
    );
    return response.data;
  },

  getPublicOffer: async (): Promise<LegalDocumentResponse> => {
    const response = await apiClient.get<LegalDocumentResponse>(
      '/cabinet/admin/legal-pages/public-offer',
    );
    return response.data;
  },

  updatePublicOffer: async (data: LegalDocumentUpdateRequest): Promise<LegalDocumentResponse> => {
    const response = await apiClient.put<LegalDocumentResponse>(
      '/cabinet/admin/legal-pages/public-offer',
      data,
    );
    return response.data;
  },

  getRules: async (): Promise<AdminRulesResponse> => {
    const response = await apiClient.get<AdminRulesResponse>('/cabinet/admin/legal-pages/rules');
    return response.data;
  },

  updateRules: async (data: RulesUpdateRequest): Promise<AdminRulesResponse> => {
    const response = await apiClient.put<AdminRulesResponse>(
      '/cabinet/admin/legal-pages/rules',
      data,
    );
    return response.data;
  },

  getFaq: async (): Promise<FaqResponse> => {
    const response = await apiClient.get<FaqResponse>('/cabinet/admin/legal-pages/faq');
    return response.data;
  },

  updateFaq: async (data: FaqUpdateRequest): Promise<FaqResponse> => {
    const response = await apiClient.put<FaqResponse>('/cabinet/admin/legal-pages/faq', data);
    return response.data;
  },

  createFaqPage: async (data: FaqPageCreateRequest): Promise<FaqPageItem> => {
    const response = await apiClient.post<FaqPageItem>(
      '/cabinet/admin/legal-pages/faq/pages',
      data,
    );
    return response.data;
  },

  updateFaqPage: async (id: number, data: FaqPageUpdateRequest): Promise<FaqPageItem> => {
    const response = await apiClient.put<FaqPageItem>(
      `/cabinet/admin/legal-pages/faq/pages/${id}`,
      data,
    );
    return response.data;
  },

  deleteFaqPage: async (id: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/legal-pages/faq/pages/${id}`);
  },
};
