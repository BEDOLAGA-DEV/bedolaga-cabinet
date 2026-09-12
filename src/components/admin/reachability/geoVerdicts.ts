/** Десять вердиктов GEO-РФ (контракт bschekbot 2026-09-11) — порядок и цвета как в легенде оригинала. */

export const GEO_VERDICTS = [
  'ok',
  'partial',
  'throttled',
  'blocked',
  'unconfirmed',
  'exit_bad',
  'target_error',
  'no_ru_node',
  'no_udp',
  'port_blocked',
] as const;
export type GeoVerdict = (typeof GEO_VERDICTS)[number];

/** Это результат по цели; остальное — шум сервиса или «не проверено», в статистику не идёт. */
const RESULT: ReadonlySet<string> = new Set([
  'ok',
  'partial',
  'throttled',
  'blocked',
  'unconfirmed',
  'target_error',
]);

/** Чем хуже, тем больше: этим же порядком красится регион на карте; −1 — не результат. */
const SEVERITY: Record<GeoVerdict, number> = {
  ok: 0,
  partial: 1,
  unconfirmed: 1,
  throttled: 2,
  target_error: 2,
  blocked: 3,
  exit_bad: -1,
  no_ru_node: -1,
  no_udp: -1,
  port_blocked: -1,
};

export type GeoTone = 'ok' | 'warn' | 'orange' | 'down' | 'na' | 'violet' | 'blue';

const TONE: Record<GeoVerdict, GeoTone> = {
  ok: 'ok',
  partial: 'warn',
  throttled: 'orange',
  blocked: 'down',
  unconfirmed: 'warn',
  exit_bad: 'na',
  target_error: 'orange',
  no_ru_node: 'na',
  no_udp: 'violet',
  port_blocked: 'blue',
};

/** Классы точки/чипа по тону; фиолетовый и синий — из палитры кабинета, без своих цветов. */
export const TONE_DOT: Record<GeoTone, string> = {
  ok: 'bg-success-400',
  warn: 'bg-warning-400',
  orange: 'bg-orange-400',
  down: 'bg-error-400',
  na: 'bg-dark-500',
  violet: 'bg-violet-400',
  blue: 'bg-sky-400',
};

export function isGeoVerdict(value: string): value is GeoVerdict {
  return (GEO_VERDICTS as readonly string[]).includes(value);
}

export function isResultVerdict(value: string): boolean {
  return RESULT.has(value);
}

export function verdictTone(value: string): GeoTone {
  return isGeoVerdict(value) ? TONE[value] : 'na';
}

/** Худший результативный вердикт из списка; шум сервиса не считается, пусто — null. */
export function worstVerdict(verdicts: readonly string[]): GeoVerdict | null {
  let worst: GeoVerdict | null = null;
  for (const value of verdicts) {
    if (!isGeoVerdict(value) || SEVERITY[value] < 0) continue;
    if (worst === null || SEVERITY[value] > SEVERITY[worst]) worst = value;
  }
  return worst;
}

/** Тон региона на карте: худший результат его городов; ничего результативного — серый. */
export function regionTone(rows: ReadonlyArray<{ verdict: string }>): GeoTone {
  const worst = worstVerdict(rows.map((row) => row.verdict));
  return worst === null ? 'na' : TONE[worst];
}
