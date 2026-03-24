export type SubscriptionStatus = 'trial_active' | 'paid_active' | 'trial_expired' | 'paid_expired';

export interface NetworkUserNode {
  id: number;
  tg_id: number | null;
  username: string | null;
  email: string | null;
  display_name: string;
  is_partner: boolean;
  referrer_id: number | null;
  campaign_id: number | null;
  direct_referrals: number;
  total_branch_users: number;
  branch_revenue_kopeks: number;
  personal_revenue_kopeks: number;
  personal_spent_kopeks: number;
  subscription_name: string | null;
  subscription_end: string | null;
  subscription_status: SubscriptionStatus | null;
  registered_at: string | null;
}

export interface NetworkCampaignNode {
  id: number;
  name: string;
  start_parameter: string;
  is_active: boolean;
  direct_users: number;
  total_network_users: number;
  total_revenue_kopeks: number;
  conversion_rate: number;
  avg_check_kopeks: number;
  top_referrers: Array<{
    user_id: number;
    username: string | null;
    referral_count: number;
  }>;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: 'referral' | 'campaign' | 'partner_campaign';
}

export interface NetworkGraphData {
  users: NetworkUserNode[];
  campaigns: NetworkCampaignNode[];
  edges: NetworkEdge[];
  total_users: number;
  total_referrers: number;
  total_campaigns: number;
  total_earnings_kopeks: number;
  total_subscription_revenue_kopeks: number;
}

export interface NetworkUserDetail {
  id: number;
  tg_id: number | null;
  username: string | null;
  email: string | null;
  display_name: string;
  is_partner: boolean;
  referrer_id: number | null;
  referrer_display_name: string | null;
  campaign_id: number | null;
  campaign_name: string | null;
  direct_referrals: number;
  total_branch_users: number;
  branch_revenue_kopeks: number;
  personal_revenue_kopeks: number;
  personal_spent_kopeks: number;
  subscription_name: string | null;
  subscription_end: string | null;
  subscription_status: SubscriptionStatus | null;
  registered_at: string | null;
}

export interface NetworkCampaignDetail {
  id: number;
  name: string;
  start_parameter: string;
  is_active: boolean;
  direct_users: number;
  total_network_users: number;
  total_revenue_kopeks: number;
  conversion_rate: number;
  avg_check_kopeks: number;
  top_referrers: Array<{
    user_id: number;
    username: string | null;
    referral_count: number;
  }>;
}

export interface NetworkSearchResult {
  users: NetworkUserNode[];
  campaigns: NetworkCampaignNode[];
}

export type SelectedNode = { type: 'user'; id: number } | { type: 'campaign'; id: number } | null;

export interface NetworkFilters {
  campaigns: number[];
  partnersOnly: boolean;
  minReferrals: number;
}

export interface CampaignOption {
  id: number;
  name: string;
  start_parameter: string;
  is_active: boolean;
  direct_users: number;
}

export interface PartnerOption {
  id: number;
  display_name: string;
  username: string | null;
  campaign_count: number;
}

export interface ScopeOptionsData {
  campaigns: CampaignOption[];
  partners: PartnerOption[];
}

export type ScopeType = 'campaign' | 'partner' | 'user';

export interface ScopeSelection {
  type: ScopeType;
  id: number;
  label: string;
}
