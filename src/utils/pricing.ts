/** Длина «месяца» в днях — тот же множитель, что использует бэкенд при расчёте цены за месяц. */
const DAYS_IN_MONTH = 30;

/**
 * Цена за месяц (в копейках) для периода длиной `days` дней.
 *
 * Возвращает `null`, когда месячная ставка не имеет смысла: для периода
 * в месяц и короче она либо повторяет цену периода (30 дней), либо
 * выдаёт цену периода за месячную (7 дней → цена семи дней «за месяц»).
 */
export function getMonthlyPriceKopeks(priceKopeks: number, days: number): number | null {
  if (!Number.isFinite(priceKopeks) || !Number.isFinite(days)) return null;
  if (days <= DAYS_IN_MONTH) return null;
  return Math.round((priceKopeks * DAYS_IN_MONTH) / days);
}
