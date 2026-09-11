/**
 * Иконки операторов (src/assets/operators/<код>.png, скруглённые квадраты 100×100).
 * Ключ — код оператора из op_key («mts|цфо|on» → «mts»). Vite хеширует файлы при сборке.
 */

const files = import.meta.glob('@/assets/operators/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const OPERATOR_ICONS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [
    (path.split('/').pop() ?? '').replace(/\.png$/, '').toLowerCase(),
    url,
  ]),
);

export function operatorCode(opKey: string): string {
  return opKey.split('|')[0];
}

export function operatorIconUrl(operator: string | null | undefined): string | null {
  if (!operator) return null;
  return OPERATOR_ICONS[operator.toLowerCase()] ?? null;
}
