/**
 * Валюта bschekbot — кредиты (1 кредит = 1 копейка). Как в самом сервисе, основная
 * единица — кредиты, рубли показываются справочно: «◈ 96 367 cred ≈ 963,67 ₽».
 */

const CREDIT_MARK = '◈';
const CREDIT_UNIT = 'cred';

export function formatKopeks(kopeks: number | null | undefined): string {
  if (kopeks === null || kopeks === undefined) return '—';
  const sign = kopeks < 0 ? '-' : '';
  const abs = Math.abs(kopeks);
  const rub = Math.trunc(abs / 100);
  const kop = abs % 100;
  const groupedRub = String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${sign}${groupedRub},${String(kop).padStart(2, '0')}\u00A0₽`;
}

/** «◈ 96 367 cred» — разряды через пробел, как показывает bschekbot. Пробелы
 * неразрывные: в узкой кнопке «cred» переносился на строку один. */
export function formatCredits(credits: number | null | undefined): string {
  if (credits === null || credits === undefined) return '—';
  const sign = credits < 0 ? '-' : '';
  const digits = String(Math.abs(Math.trunc(credits)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${CREDIT_MARK}\u00A0${sign}${grouped}\u00A0${CREDIT_UNIT}`;
}

/** Кредиты и рублёвый эквивалент рядом: «◈ 640 cred ≈ 6,40 ₽». */
export function formatMoney(credits: number | null | undefined): string {
  if (credits === null || credits === undefined) return '—';
  return `${formatCredits(credits)} ≈ ${formatKopeks(credits)}`;
}
