import apiClient from './client';
import type { ReferralLevelsMode, ReferralRewardLevel, ReferralRewardLevels } from '../types';

// ==================== User-facing types ====================

export interface PartnerApplicationInfo {
  id: number;
  status: string;
  company_name: string | null;
  website_url: string | null;
  telegram_channel: string | null;
  description: string | null;
  expected_monthly_referrals: number | null;
  desired_commission_percent: number | null;
  admin_comment: string | null;
  approved_commission_percent: number | null;
  created_at: string;
  processed_at: string | null;
}

export interface PartnerCampaignInfo {
  id: number;
  name: string;
  start_parameter: string;
  bonus_type: string;
  balance_bonus_kopeks: number;
  subscription_duration_days: number | null;
  subscription_traffic_gb: number | null;
  deep_link: string | null;
  web_link: string | null;
  // Per-campaign statistics
  registrations_count: number;
  referrals_count: number;
  earnings_kopeks: number;
}

export interface PartnerStatusResponse {
  partner_status: string;
  commission_percent: number | null;
  latest_application: PartnerApplicationInfo | null;
  campaigns: PartnerCampaignInfo[];
}

export interface PartnerApplicationRequest {
  company_name?: string;
  website_url?: string;
  telegram_channel?: string;
  description?: string;
  expected_monthly_referrals?: number;
  desired_commission_percent?: number;
}

// ==================== Campaign detailed stats types ====================

export interface DailyStatItem {
  date: string;
  referrals_count: number;
  earnings_kopeks: number;
}

export interface PeriodStats {
  days: number;
  referrals_count: number;
  earnings_kopeks: number;
}

export interface PeriodChange {
  absolute: number;
  percent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PeriodComparison {
  current: PeriodStats;
  previous: PeriodStats;
  referrals_change: PeriodChange;
  earnings_change: PeriodChange;
}

export interface CampaignReferralItem {
  id: number;
  full_name: string;
  created_at: string;
  has_paid: boolean;
  is_active: boolean;
  total_earnings_kopeks: number;
}

export interface PartnerCampaignDetailedStats {
  campaign_id: number;
  campaign_name: string;
  registrations_count: number;
  referrals_count: number;
  earnings_kopeks: number;
  conversion_rate: number;
  earnings_today: number;
  earnings_week: number;
  earnings_month: number;
  daily_stats: DailyStatItem[];
  period_comparison: PeriodComparison;
  top_referrals: CampaignReferralItem[];
}

// ==================== Admin-facing types ====================

export interface AdminPartnerApplicationItem {
  id: number;
  user_id: number;
  username: string | null;
  first_name: string | null;
  telegram_id: number | null;
  company_name: string | null;
  website_url: string | null;
  telegram_channel: string | null;
  description: string | null;
  expected_monthly_referrals: number | null;
  desired_commission_percent: number | null;
  status: string;
  admin_comment: string | null;
  approved_commission_percent: number | null;
  created_at: string;
  processed_at: string | null;
}

export interface AdminPartnerApplicationsResponse {
  items: AdminPartnerApplicationItem[];
  total: number;
}

export interface AdminPartnerItem {
  user_id: number;
  username: string | null;
  first_name: string | null;
  telegram_id: number | null;
  commission_percent: number | null;
  total_referrals: number;
  total_earnings_kopeks: number;
  balance_kopeks: number;
  partner_status: string;
  created_at: string;
}

export interface AdminPartnerListResponse {
  items: AdminPartnerItem[];
  total: number;
}

export interface AdminPartnerDetailResponse {
  user_id: number;
  username: string | null;
  first_name: string | null;
  telegram_id: number | null;
  commission_percent: number | null;
  partner_status: string;
  balance_kopeks: number;
  total_referrals: number;
  paid_referrals: number;
  active_referrals: number;
  earnings_all_time: number;
  earnings_today: number;
  earnings_week: number;
  earnings_month: number;
  conversion_to_paid: number;
  campaigns: {
    id: number;
    name: string;
    start_parameter: string;
    is_active: boolean;
    registrations_count: number;
    referrals_count: number;
    earnings_kopeks: number;
  }[];
  created_at: string;
}

export interface PartnerStats {
  total_partners: number;
  pending_applications: number;
  total_referrals: number;
  total_earnings_kopeks: number;
}

// ==================== Partner Settings types ====================

export interface PartnerSettings {
  withdrawal_enabled: boolean;
  withdrawal_min_amount_kopeks: number;
  withdrawal_cooldown_days: number;
  withdrawal_requisites_text: string;
  partner_section_visible: boolean;
  referral_program_enabled: boolean;
}

export interface PartnerSettingsUpdate {
  withdrawal_enabled?: boolean;
  withdrawal_min_amount_kopeks?: number;
  withdrawal_cooldown_days?: number;
  withdrawal_requisites_text?: string;
  partner_section_visible?: boolean;
  referral_program_enabled?: boolean;
}

export const partnerApi = {
  // User endpoints
  getStatus: async (): Promise<PartnerStatusResponse> => {
    const response = await apiClient.get<PartnerStatusResponse>('/cabinet/referral/partner/status');
    return response.data;
  },

  apply: async (data: PartnerApplicationRequest): Promise<PartnerApplicationInfo> => {
    const response = await apiClient.post<PartnerApplicationInfo>(
      '/cabinet/referral/partner/apply',
      data,
    );
    return response.data;
  },

  getCampaignStats: async (campaignId: number): Promise<PartnerCampaignDetailedStats> => {
    const response = await apiClient.get<PartnerCampaignDetailedStats>(
      `/cabinet/referral/partner/campaigns/${campaignId}/stats`,
    );
    return response.data;
  },

  // Admin endpoints
  getStats: async (): Promise<PartnerStats> => {
    const response = await apiClient.get<PartnerStats>('/cabinet/admin/partners/stats');
    return response.data;
  },

  getApplications: async (params?: {
    status?: string;
    offset?: number;
    limit?: number;
  }): Promise<AdminPartnerApplicationsResponse> => {
    const response = await apiClient.get<AdminPartnerApplicationsResponse>(
      '/cabinet/admin/partners/applications',
      { params },
    );
    return response.data;
  },

  approveApplication: async (
    applicationId: number,
    data: { commission_percent: number; comment?: string },
  ): Promise<void> => {
    await apiClient.post(`/cabinet/admin/partners/applications/${applicationId}/approve`, data);
  },

  rejectApplication: async (applicationId: number, data: { comment?: string }): Promise<void> => {
    await apiClient.post(`/cabinet/admin/partners/applications/${applicationId}/reject`, data);
  },

  getPartners: async (params?: {
    offset?: number;
    limit?: number;
  }): Promise<AdminPartnerListResponse> => {
    const response = await apiClient.get<AdminPartnerListResponse>('/cabinet/admin/partners', {
      params,
    });
    return response.data;
  },

  getPartnerDetail: async (userId: number): Promise<AdminPartnerDetailResponse> => {
    const response = await apiClient.get<AdminPartnerDetailResponse>(
      `/cabinet/admin/partners/${userId}`,
    );
    return response.data;
  },

  updateCommission: async (userId: number, commissionPercent: number): Promise<void> => {
    await apiClient.patch(`/cabinet/admin/partners/${userId}/commission`, {
      commission_percent: commissionPercent,
    });
  },

  revokePartner: async (userId: number): Promise<void> => {
    await apiClient.post(`/cabinet/admin/partners/${userId}/revoke`);
  },

  assignCampaign: async (userId: number, campaignId: number): Promise<void> => {
    await apiClient.post(`/cabinet/admin/partners/${userId}/campaigns/${campaignId}/assign`);
  },

  unassignCampaign: async (userId: number, campaignId: number): Promise<void> => {
    await apiClient.post(`/cabinet/admin/partners/${userId}/campaigns/${campaignId}/unassign`);
  },

  // Settings
  getPartnerSettings: async (): Promise<PartnerSettings> => {
    const response = await apiClient.get<PartnerSettings>('/cabinet/admin/partners/settings');
    return response.data;
  },

  updatePartnerSettings: async (data: PartnerSettingsUpdate): Promise<PartnerSettings> => {
    const response = await apiClient.patch<PartnerSettings>(
      '/cabinet/admin/partners/settings',
      data,
    );
    return response.data;
  },

  // Reward levels
  getReferralLevels: async (): Promise<ReferralRewardLevels> => {
    const response = await apiClient.get<ReferralRewardLevels>(
      '/cabinet/admin/partners/referral-levels',
    );
    return response.data;
  },

  /**
   * Sends ONLY the fields being changed. The editor writes one field at a time and
   * the bot writes the same table, so shipping the whole object would silently
   * overwrite an edit made there a moment earlier.
   */
  upsertReferralLevel: async (
    level: number,
    patch: Partial<
      Omit<ReferralRewardLevel, 'level' | 'referrer_tariff_name' | 'referee_tariff_name'>
    >,
  ): Promise<ReferralRewardLevels> => {
    const response = await apiClient.put<ReferralRewardLevels>(
      `/cabinet/admin/partners/referral-levels/${level}`,
      patch,
    );
    return response.data;
  },

  deleteReferralLevel: async (level: number): Promise<ReferralRewardLevels> => {
    const response = await apiClient.delete<ReferralRewardLevels>(
      `/cabinet/admin/partners/referral-levels/${level}`,
    );
    return response.data;
  },

  /** Переносит действующие REFERRAL_* в уровень 1 — выключенным, для проверки. */
  importLegacyReferralSettings: async (): Promise<ReferralRewardLevels> => {
    const response = await apiClient.post<ReferralRewardLevels>(
      '/cabinet/admin/partners/referral-levels/import-legacy',
    );
    return response.data;
  },

  /** How many links up the chain are paid; capped at max_supported_level. */
  updateReferralDepth: async (maxLevelDepth: number): Promise<ReferralRewardLevels> => {
    const response = await apiClient.patch<ReferralRewardLevels>(
      '/cabinet/admin/partners/referral-depth',
      { max_level_depth: maxLevelDepth },
    );
    return response.data;
  },

  updateReferralScheme: async (scheme: 'legacy' | 'levels'): Promise<ReferralRewardLevels> => {
    const response = await apiClient.patch<ReferralRewardLevels>(
      '/cabinet/admin/partners/referral-scheme',
      { scheme },
    );
    return response.data;
  },

  /** Whether a level number means chain depth or a rank earned by referral count. */
  updateReferralLevelsMode: async (mode: ReferralLevelsMode): Promise<ReferralRewardLevels> => {
    const response = await apiClient.patch<ReferralRewardLevels>(
      '/cabinet/admin/partners/referral-levels-mode',
      { levels_mode: mode },
    );
    return response.data;
  },
};
