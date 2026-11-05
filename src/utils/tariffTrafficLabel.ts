import type { TFunction } from 'i18next';

/** The numeric API limit is language-independent; cached labels may use the profile language. */
export function tariffTrafficLabel(gb: number, t: TFunction): string {
  return gb === 0
    ? `♾️ ${t('subscription.unlimited', 'Безлимит')}`
    : `${gb} ${t('common.units.gb', 'ГБ')}`;
}
