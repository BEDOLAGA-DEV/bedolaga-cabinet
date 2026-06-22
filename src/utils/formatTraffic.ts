/**
 * Format traffic amount with appropriate unit (MB/GB/TB).
 * Matches the prototype's formatBytes logic.
 */
export function formatTraffic(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}

/**
 * Returns the i18n key for the "per <period>" suffix to display next to a
 * traffic limit, based on the tariff's traffic reset mode.
 *
 * Reset modes mirror the backend: 'DAY', 'WEEK', 'MONTH', 'MONTH_ROLLING',
 * 'NO_RESET'. A null/undefined mode means "use the global default", which is
 * MONTH on the backend — so we fall back to the monthly suffix.
 *
 * Returns null for NO_RESET (the limit is for the whole period, no suffix).
 */
export function trafficResetSuffixKey(resetMode?: string | null): string | null {
  switch (resetMode) {
    case 'NO_RESET':
      return null;
    case 'DAY':
      return 'common.units.perDayTraffic';
    case 'WEEK':
      return 'common.units.perWeekTraffic';
    case 'MONTH':
    case 'MONTH_ROLLING':
    default:
      return 'common.units.perMonthTraffic';
  }
}
