import i18n from '../i18n';
import { formatDecimal } from './formatNumber';
import { uiLocale } from './uiLocale';

/**
 * Format traffic amount with appropriate unit (MB/GB/TB).
 * Units come from i18n so RU shows «ГБ» consistently with the rest of the UI
 * (templates previously mixed latin "GB" with localized «ГБ» on one screen);
 * the decimal separator follows the interface language («41,2 ГБ», not «41.2 ГБ»).
 */
export function formatTraffic(gb: number, locale: string = uiLocale()): string {
  if (gb >= 1000)
    return `${formatDecimal(gb / 1000, 1, locale)} ${i18n.t('common.units.tb', 'TB')}`;
  if (gb >= 1) return `${formatDecimal(gb, 1, locale)} ${i18n.t('common.units.gb', 'GB')}`;
  return `${formatDecimal(gb * 1024, 0, locale)} ${i18n.t('common.units.mb', 'MB')}`;
}
