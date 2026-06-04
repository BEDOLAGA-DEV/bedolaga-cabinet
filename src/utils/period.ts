/** First day of the current month → today, as local YYYY-MM-DD strings.
 * Used as the default sales-stats window ("this month so far"). */
export function getMonthToDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const toLocalISODate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    startDate: toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toLocalISODate(now),
  };
}

/** True when the period is exactly "from the 1st of the current month to today". */
export function isMonthToDate(period: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): boolean {
  if (period.days !== undefined) return false;
  const mtd = getMonthToDateRange();
  return period.startDate === mtd.startDate && period.endDate === mtd.endDate;
}
