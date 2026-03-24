import type { SubscriptionStatus } from '@/types/referralNetwork';

/**
 * Format kopeks to a human-readable ruble string.
 */
export function formatKopeksToRubles(kopeks: number): string {
  return `${(kopeks / 100).toLocaleString('ru-RU')}`;
}

/**
 * Single source of truth for user node colors.
 */
export const NODE_COLORS = {
  partner: '#f0c261',
  topReferrer: '#e85d9a',
  activeReferrer: '#7c6aef',
  paidActive: '#22c55e',
  trialActive: '#38bdf8',
  paidExpired: '#ef4444',
  trialExpired: '#fb923c',
  campaignUser: '#fbbf24',
  regular: '#94a3b8',
} as const;

/**
 * Map subscription status to its node color.
 */
const SUBSCRIPTION_STATUS_COLOR: Record<SubscriptionStatus, string> = {
  paid_active: NODE_COLORS.paidActive,
  trial_active: NODE_COLORS.trialActive,
  paid_expired: NODE_COLORS.paidExpired,
  trial_expired: NODE_COLORS.trialExpired,
};

export function getSubscriptionStatusColor(status: SubscriptionStatus): string {
  return SUBSCRIPTION_STATUS_COLOR[status];
}

/**
 * Fill color priority:
 * 1. Subscription status (when available)
 * 2. Referral role (when no subscription data — keeps visual differentiation)
 * 3. Regular fallback (campaign membership visible via edges, not fill)
 */
export function getNodeFillColor(
  subscriptionStatus: SubscriptionStatus | null,
  directReferrals: number = 0,
  isPartner: boolean = false,
): string {
  if (subscriptionStatus) return SUBSCRIPTION_STATUS_COLOR[subscriptionStatus];
  if (isPartner) return NODE_COLORS.partner;
  if (directReferrals >= 10) return NODE_COLORS.topReferrer;
  if (directReferrals >= 1) return NODE_COLORS.activeReferrer;
  return NODE_COLORS.regular;
}

/**
 * Border color = referral role. Returns null if no special role.
 */
export function getNodeBorderColor(directReferrals: number, isPartner: boolean): string | null {
  if (isPartner) return NODE_COLORS.partner;
  if (directReferrals >= 10) return NODE_COLORS.topReferrer;
  if (directReferrals >= 1) return NODE_COLORS.activeReferrer;
  return null;
}

/**
 * Campaign node color palette. Each campaign gets a distinct color
 * based on its index position.
 */
const CAMPAIGN_COLORS = [
  '#4dd9c0',
  '#f0c261',
  '#e85d9a',
  '#6b9fff',
  '#b97aff',
  '#ff8a65',
  '#66d9a0',
  '#ff6b9d',
  '#7ec8e3',
  '#c4b5fd',
];

export function getCampaignColor(index: number): string {
  return CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length];
}

/**
 * Determine the visual size for a user node.
 * Size is proportional to direct_referrals, clamped between min and max.
 */
export function getUserNodeSize(directReferrals: number): number {
  if (directReferrals === 0) return 5;
  if (directReferrals <= 2) return 10;
  return Math.min(40, 10 + Math.sqrt(directReferrals) * 4);
}
