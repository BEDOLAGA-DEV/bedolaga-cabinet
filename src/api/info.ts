import apiClient from './client';
import type { SupportConfig } from '../types';

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

export const infoApi = {
  // Get FAQ pages list
  getFaqPages: async (): Promise<FaqPage[]> => {
    const response = await apiClient.get<FaqPage[]>('/cabinet/info/faq');
    return response.data;
  },

  // Get specific FAQ page
  getFaqPage: async (pageId: number): Promise<FaqPage> => {
    const response = await apiClient.get<FaqPage>(`/cabinet/info/faq/${pageId}`);
    return response.data;
  },

  // Get service rules
  getRules: async (): Promise<RulesResponse> => {
    const response = await apiClient.get<RulesResponse>('/cabinet/info/rules');
    return response.data;
  },

  // Get privacy policy
  getPrivacyPolicy: async (): Promise<PrivacyPolicyResponse> => {
    const response = await apiClient.get<PrivacyPolicyResponse>('/cabinet/info/privacy-policy');
    return response.data;
  },

  // Get public offer
  getPublicOffer: async (): Promise<PublicOfferResponse> => {
    const response = await apiClient.get<PublicOfferResponse>('/cabinet/info/public-offer');
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
};
