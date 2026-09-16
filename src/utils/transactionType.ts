/**
 * Подпись и цвет типа операции в истории баланса.
 *
 * Бот знает восемь типов (TransactionType); кабинет раньше подписывал четыре,
 * а остальные показывал служебным именем — «gift_payment», «refund». Незнакомый
 * тип из будущей версии бота — нейтральное «Операция».
 */
const TYPES: Record<string, { label: string; badge: string }> = {
  DEPOSIT: { label: 'balance.deposit', badge: 'badge-success' },
  WITHDRAWAL: { label: 'balance.withdrawal', badge: 'badge-error' },
  SUBSCRIPTION_PAYMENT: { label: 'balance.subscriptionPayment', badge: 'badge-info' },
  REFUND: { label: 'balance.refund', badge: 'badge-success' },
  FAILED_REFUND: { label: 'balance.failedRefund', badge: 'badge-error' },
  REFERRAL_REWARD: { label: 'balance.referralReward', badge: 'badge-warning' },
  POLL_REWARD: { label: 'balance.pollReward', badge: 'badge-warning' },
  GIFT_PAYMENT: { label: 'balance.giftPayment', badge: 'badge-info' },
};

const lookup = (type: string) => TYPES[type?.toUpperCase?.() ?? ''];

export function transactionTypeLabelKey(type: string): string {
  return lookup(type)?.label ?? 'balance.otherOperation';
}

export function transactionTypeBadge(type: string): string {
  return lookup(type)?.badge ?? 'badge-neutral';
}
