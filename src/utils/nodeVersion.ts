/**
 * Сравнение версий узла Remnawave.
 *
 * Панель отдаёт `versions: { xray, node }` строками вида `3.3.0`; иногда с
 * префиксом `v` или суффиксом пререлиза (`3.3.0-rc.1`). Нам нужен только
 * порог «фича появилась начиная с версии X», поэтому сравниваем три числа
 * и намеренно НЕ разбираем пререлизы по правилам semver: `3.3.0-rc.1`
 * считается достаточным для 3.3.0 — фича там уже есть.
 */

/** Версия узла, при которой в панели появился GeoCheck. */
export const GEOCHECK_MIN_NODE_VERSION = '3.3.0';

function parseVersion(value: string): [number, number, number] | null {
  const match = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

/** `true`, если `value` не старше `minimum`. Нераспознанная версия — `false`. */
export function isVersionAtLeast(value: string | null | undefined, minimum: string): boolean {
  if (!value) return false;

  const parsed = parseVersion(value);
  const floor = parseVersion(minimum);
  if (!parsed || !floor) return false;

  for (let i = 0; i < 3; i += 1) {
    if (parsed[i] !== floor[i]) return parsed[i] > floor[i];
  }
  return true;
}

/**
 * Умеет ли узел в GeoCheck.
 *
 * Гейт по версии УЗЛА, а не панели: панель без 3.3.0 ответит на запрос 404, и
 * бэкенд превратит это в понятную ошибку — а вот кнопку на заведомо старом
 * узле показывать незачем.
 */
export function supportsGeoCheck(versions: { node?: string } | null | undefined): boolean {
  return isVersionAtLeast(versions?.node, GEOCHECK_MIN_NODE_VERSION);
}
