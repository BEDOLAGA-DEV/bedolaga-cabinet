/**
 * Format kopeks to a human-readable ruble string.
 */
export function formatKopeksToRubles(kopeks: number): string {
  return `${(kopeks / 100).toLocaleString('ru-RU')}`;
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
 * Determine the visual color for a user node.
 */
export function getUserNodeColor(
  directReferrals: number,
  isPartner: boolean,
  campaignId: number | null,
): string {
  if (isPartner) return '#f0c261';
  if (directReferrals >= 10) return '#e85d9a';
  if (directReferrals >= 1) return '#7c6aef';
  if (campaignId !== null) return '#4dd9c0';
  return '#6b7280';
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
