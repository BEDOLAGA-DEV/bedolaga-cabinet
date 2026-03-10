export const PAID_STATUSES = new Set([
  'succeeded',
  'success',
  'paid',
  'paid_over',
  'overpaid',
  'completed',
  'confirmed',
  'closed',
]);

export const FAILED_STATUSES = new Set([
  'fail',
  'failed',
  'error',
  'canceled',
  'cancelled',
  'declined',
  'expired',
  'cancel',
  'system_fail',
  'refund_paid',
]);

export function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.has(status.toLowerCase());
}

export function isFailedStatus(status: string): boolean {
  return FAILED_STATUSES.has(status.toLowerCase());
}
