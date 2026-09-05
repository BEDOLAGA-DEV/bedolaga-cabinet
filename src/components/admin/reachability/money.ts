/** 1 кредит bschekbot = 1 копейка. Показываем рубли с копейками через запятую. */
export function formatKopeks(kopeks: number | null | undefined): string {
  if (kopeks === null || kopeks === undefined) return '—';
  const sign = kopeks < 0 ? '-' : '';
  const abs = Math.abs(kopeks);
  const rub = Math.trunc(abs / 100);
  const kop = abs % 100;
  return `${sign}${rub},${String(kop).padStart(2, '0')} ₽`;
}
