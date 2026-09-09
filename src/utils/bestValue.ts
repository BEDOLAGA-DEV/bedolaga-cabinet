/**
 * Отметка «Выгодно» ставится оператором у тарифа: сам тариф и один период
 * внутри него. Сервер отдаёт её признаком `is_highlighted` на каждой витрине —
 * покупка, продление, подарок, лендинг.
 *
 * Витрина не только обводит отмеченное рамкой, но и выбирает его сразу: иначе
 * клиент видит «-45%» на годовом периоде, а в итоге снизу — цену месячного.
 * Своей выгоды здесь не считаем: не отметил оператор — остаётся прежний выбор.
 */

export interface Highlightable {
  is_highlighted?: boolean | null;
}

/** Первый элемент, отмеченный оператором как выгодный. */
export function pickBestValue<T extends Highlightable>(
  items: readonly T[] | null | undefined,
): T | undefined {
  return items?.find((item) => Boolean(item.is_highlighted));
}
