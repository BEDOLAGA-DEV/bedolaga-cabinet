import { apiClient } from './client';

export interface SiteVerification {
  apay_tag: string | null;
}

/**
 * Public, unauthenticated endpoint — payment-provider crawlers (Antilopay)
 * need to be able to read these values to validate site ownership.
 */
export const siteVerificationApi = {
  async get(): Promise<SiteVerification> {
    const { data } = await apiClient.get<SiteVerification>('/cabinet/public/site-verification');
    return data;
  },
};
