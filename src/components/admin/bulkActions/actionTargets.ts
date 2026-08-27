import type { BulkActionType } from '../../../api/adminBulkActions';

// ──────────────────────────────────────────────────────────────────
// Bulk-action target classification.
//
// Some actions operate on user-rows (assign promo group, add balance,
// delete user); others operate on individual subscription-rows
// (extend, cancel, change tariff, etc.). The set below is the source
// of truth shared between FloatingActionBar (renders two grouped
// menus when multi-tariff is on) and the parent page (gates the
// selection-count semantics and the active-paid count in delete).
// ──────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_LEVEL_ACTIONS: Set<BulkActionType> = new Set([
  'extend_subscription',
  'add_days',
  'cancel_subscription',
  'activate_subscription',
  'change_tariff',
  'add_traffic',
  'set_devices',
  'delete_subscription',
]);

export function isSubscriptionLevelAction(action: BulkActionType): boolean {
  return SUBSCRIPTION_LEVEL_ACTIONS.has(action);
}
