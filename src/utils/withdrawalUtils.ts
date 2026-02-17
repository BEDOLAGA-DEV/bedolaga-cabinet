import i18n from '../i18n';

export const localeMap: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  zh: 'zh-CN',
  fa: 'fa-IR',
};

export const formatDate = (date: string | null): string => {
  if (!date) return '-';
  const locale = localeMap[i18n.language] || 'ru-RU';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export type StatusBadge = { labelKey: string; color: string; bgColor: string };

export const withdrawalStatusBadgeConfig: Record<string, StatusBadge> = {
  pending: {
    labelKey: 'admin.withdrawals.status.pending',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  approved: {
    labelKey: 'admin.withdrawals.status.approved',
    color: 'text-accent-400',
    bgColor: 'bg-accent-500/20',
  },
  rejected: {
    labelKey: 'admin.withdrawals.status.rejected',
    color: 'text-error-400',
    bgColor: 'bg-error-500/20',
  },
  completed: {
    labelKey: 'admin.withdrawals.status.completed',
    color: 'text-success-400',
    bgColor: 'bg-success-500/20',
  },
  cancelled: {
    labelKey: 'admin.withdrawals.status.cancelled',
    color: 'text-dark-400',
    bgColor: 'bg-dark-500/20',
  },
};

const unknownBadge: StatusBadge = {
  labelKey: 'admin.withdrawals.status.unknown',
  color: 'text-dark-400',
  bgColor: 'bg-dark-600',
};

export function getWithdrawalStatusBadge(status: string): StatusBadge {
  return withdrawalStatusBadgeConfig[status] || unknownBadge;
}

export function getRiskColor(score: number): { text: string; bg: string; bar: string } {
  if (score < 30)
    return { text: 'text-success-400', bg: 'bg-success-500/20', bar: 'bg-success-500' };
  if (score < 50) return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', bar: 'bg-yellow-500' };
  if (score < 70) return { text: 'text-orange-400', bg: 'bg-orange-500/20', bar: 'bg-orange-500' };
  return { text: 'text-error-400', bg: 'bg-error-500/20', bar: 'bg-error-500' };
}

export function getRiskLevelColor(level: string): { text: string; bg: string } {
  switch (level) {
    case 'low':
      return { text: 'text-success-400', bg: 'bg-success-500/20' };
    case 'medium':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    case 'high':
      return { text: 'text-orange-400', bg: 'bg-orange-500/20' };
    case 'critical':
      return { text: 'text-error-400', bg: 'bg-error-500/20' };
    default:
      return { text: 'text-dark-400', bg: 'bg-dark-500/20' };
  }
}
