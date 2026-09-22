import { getTrafficZone } from './trafficZone';

/**
 * Порог, с которого простой вид позволяет себе тревожный цвет.
 *
 * Общая шкала кабинета (getTrafficZone) желтеет уже на половине трафика. Для
 * полного вида это уместно — там рядом десяток других сигналов, и один цветной
 * among them не кричит. На простом экране цветных элементов ровно два, и если
 * шкала желтеет на 50%, человек читает это как «что-то не так», хотя половина
 * трафика — нормальная середина месяца.
 *
 * Поэтому цвет здесь появляется только там, где он означает действие: пора
 * докупить трафик или продлить. Пороги остаются общими — берём их из
 * getTrafficZone, чтобы «опасно» в двух видах кабинета не означало разное.
 */
const ALARM_FROM_PERCENT = 75;

/** Цвет заполненной части шкалы: акцент оператора либо цвет зоны. */
export function liteMeterColor(percent: number): string {
  if (!Number.isFinite(percent) || percent < ALARM_FROM_PERCENT) {
    return 'rgb(var(--color-accent-500))';
  }
  return getTrafficZone(percent).mainVar;
}

/** Доля заполнения шкалы в процентах, пригодная для ширины. */
export function liteMeterWidth(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(100, percent);
}
