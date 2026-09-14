import { uiLocale } from './uiLocale';

/**
 * Числа по правилам языка интерфейса: «3 002,00» на русском, «3,002.00» на английском.
 * `toFixed` для экрана не годится — он всегда пишет точку и не делит разряды.
 */

export function formatDecimal(
  value: number,
  decimals: number,
  locale: string = uiLocale(),
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Самое маленькое ненулевое значение, которое ещё видно с одним знаком после запятой. */
const MIN_VISIBLE_GB = 0.1;

/**
 * Гигабайты в админке: целые — без «,0», дробные — один знак. Ненулевой расход меньше
 * десятой показывается как «0,1», чтобы человек с трафиком не выглядел как «0».
 */
export function formatGb(value: number, locale: string = uiLocale()): string {
  const shown = value > 0 && value < MIN_VISIBLE_GB ? MIN_VISIBLE_GB : value;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(shown);
}

/** «870 / 1 500 ГБ»: лимиты в админке задаются в гигабайтах, единица одна на пару. */
export function formatGbPair(
  usedGb: number,
  limitGb: number,
  unit: string,
  locale: string = uiLocale(),
): string {
  return `${formatGb(usedGb, locale)} / ${formatGb(limitGb, locale)} ${unit}`;
}
