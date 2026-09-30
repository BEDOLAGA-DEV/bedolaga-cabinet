import apiClient from './client';
import type { LegalConsentConfig, SupportConfig } from '../types';

export interface FaqPage {
  id: number;
  title: string;
  content: string;
  order: number;
}

export interface RulesResponse {
  content: string;
  updated_at: string | null;
}

export interface PrivacyPolicyResponse {
  content: string;
  updated_at: string | null;
}

export interface PublicOfferResponse {
  content: string;
  updated_at: string | null;
}

export interface RecurrentPaymentsResponse {
  content: string;
  updated_at: string | null;
}

export interface ServiceInfo {
  name: string;
  description: string | null;
  support_email: string | null;
  support_telegram: string | null;
  website: string | null;
}

export interface LanguageInfo {
  code: string;
  name: string;
  flag: string;
}

export interface InfoVisibility {
  faq: boolean;
  rules: boolean;
  privacy: boolean;
  offer: boolean;
  recurrent: boolean;
}

// Язык интерфейса уходит в query: без него бэкенд отдаёт документы на языке по умолчанию.
const languageParams = (language?: string) => (language ? { params: { language } } : undefined);

export const infoApi = {
  // Get FAQ pages list
  getFaqPages: async (language?: string): Promise<FaqPage[]> => {
    const response = await apiClient.get<FaqPage[]>('/cabinet/info/faq', languageParams(language));
    return response.data;
  },

  // Get specific FAQ page
  getFaqPage: async (pageId: number, language?: string): Promise<FaqPage> => {
    const response = await apiClient.get<FaqPage>(
      `/cabinet/info/faq/${pageId}`,
      languageParams(language),
    );
    return response.data;
  },

  // Get service rules
  getRules: async (language?: string): Promise<RulesResponse> => {
    const response = await apiClient.get<RulesResponse>(
      '/cabinet/info/rules',
      languageParams(language),
    );
    return response.data;
  },

  // Get privacy policy
  getPrivacyPolicy: async (language?: string): Promise<PrivacyPolicyResponse> => {
    const response = await apiClient.get<PrivacyPolicyResponse>(
      '/cabinet/info/privacy-policy',
      languageParams(language),
    );
    return response.data;
  },

  // Get public offer
  getPublicOffer: async (language?: string): Promise<PublicOfferResponse> => {
    const response = await apiClient.get<PublicOfferResponse>(
      '/cabinet/info/public-offer',
      languageParams(language),
    );
    return response.data;
  },

  // Get recurring-payments document
  getRecurrentPayments: async (language?: string): Promise<RecurrentPaymentsResponse> => {
    const response = await apiClient.get<RecurrentPaymentsResponse>(
      '/cabinet/info/recurrent-payments',
      languageParams(language),
    );
    return response.data;
  },

  // Get service info
  getServiceInfo: async (): Promise<ServiceInfo> => {
    const response = await apiClient.get<ServiceInfo>('/cabinet/info/service');
    return response.data;
  },

  // Get available languages
  getLanguages: async (): Promise<{ languages: LanguageInfo[]; default: string }> => {
    const response = await apiClient.get('/cabinet/info/languages');
    return response.data;
  },

  // Get user language
  getUserLanguage: async (): Promise<{ language: string }> => {
    const response = await apiClient.get<{ language: string }>('/cabinet/info/user/language');
    return response.data;
  },

  // Update user language
  updateUserLanguage: async (language: string): Promise<{ language: string }> => {
    const response = await apiClient.patch<{ language: string }>('/cabinet/info/user/language', {
      language,
    });
    return response.data;
  },

  // Get support configuration
  getSupportConfig: async (): Promise<SupportConfig> => {
    const response = await apiClient.get<SupportConfig>('/cabinet/info/support-config');
    return response.data;
  },

  getVisibility: async (): Promise<InfoVisibility> => {
    const response = await apiClient.get<InfoVisibility>('/cabinet/info/visibility');
    return response.data;
  },

  // Публичный: экран логина запрашивает это ДО авторизации.
  getLegalConsentConfig: async (language?: string): Promise<LegalConsentConfig> => {
    const response = await apiClient.get<LegalConsentConfig>('/cabinet/info/legal-consent', {
      params: language ? { language } : undefined,
    });
    return response.data;
  },
};
