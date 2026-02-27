import { AxiosError } from 'axios';
import i18n from '../i18n';

export type PurchaseStep = 'period' | 'traffic' | 'servers' | 'devices' | 'confirm';

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && detail?.message) return detail.message;
  }
  if (error instanceof Error) return error.message;
  return i18n.t('common.error');
};

export const getInsufficientBalanceError = (
  error: unknown,
): { required: number; balance: number; missingAmount?: number } | null => {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (
      typeof detail === 'object' &&
      (detail?.code === 'insufficient_balance' || detail?.code === 'insufficient_funds')
    ) {
      return {
        required: detail.required || detail.total_price || 0,
        balance: detail.balance || 0,
        missingAmount: detail.missing_amount || detail.missingAmount || 0,
      };
    }
  }
  return null;
};

export const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};
