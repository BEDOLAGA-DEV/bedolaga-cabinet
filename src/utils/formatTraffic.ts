import i18n from '../i18n';

/**
 * Format traffic amount with appropriate unit (MB/GB/TB).
 * Units come from i18n so RU shows «ГБ» consistently with the rest of the UI
 * (templates previously mixed latin "GB" with localized «ГБ» on one screen).
 */
export function formatTraffic(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} ${i18n.t('common.units.tb', 'TB')}`;
  if (gb >= 1) return `${gb.toFixed(1)} ${i18n.t('common.units.gb', 'GB')}`;
  return `${(gb * 1024).toFixed(0)} ${i18n.t('common.units.mb', 'MB')}`;
}
