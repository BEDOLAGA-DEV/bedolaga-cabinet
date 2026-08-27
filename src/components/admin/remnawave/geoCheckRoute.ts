import type { GeoCheckRequest, NodeInfo } from '@/api/adminRemnawave';

/** Откуда гнать проверку. */
export type GeoCheckRouteMode = 'default' | 'ip' | 'interface';

/**
 * Те же правила, что и на бэкенде (`GeocheckRequest`): значение уезжает в
 * панель и дальше на узел, поэтому форма не должна пропускать мусор. Здесь
 * проверка нужна не ради безопасности — она ради того, чтобы админ увидел
 * ошибку сразу, а не через полминуты ожидания.
 */
const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;
const INTERFACE_RE = /^[A-Za-z0-9][A-Za-z0-9_.@-]{0,31}$/;

export function isValidIpAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (IPV4_RE.test(trimmed)) return true;
  // IPv6 без полного разбора: достаточно набора символов и одного «::»-стиля
  // разделителя. Точный разбор делает панель, здесь важно отсечь опечатки.
  return trimmed.includes(':') && IPV6_RE.test(trimmed) && !trimmed.includes(':::');
}

export function isValidInterfaceName(value: string): boolean {
  return INTERFACE_RE.test(value.trim());
}

/** Готово ли значение к отправке в выбранном режиме. */
export function isRouteReady(mode: GeoCheckRouteMode, value: string): boolean {
  if (mode === 'default') return true;
  if (mode === 'ip') return isValidIpAddress(value);
  return isValidInterfaceName(value);
}

/** Тело запроса для выбранного режима. */
export function buildGeoCheckRequest(mode: GeoCheckRouteMode, value: string): GeoCheckRequest {
  const trimmed = value.trim();
  if (mode === 'ip' && trimmed) return { ip: trimmed };
  if (mode === 'interface' && trimmed) return { interface: trimmed };
  return {};
}

/** Адреса узла, которые имеет смысл предлагать как исходные. */
export function suggestedIps(node: NodeInfo): string[] {
  const fromPanel = (node.ips ?? []).filter((entry) => entry.status !== 'BLOCKED').map((e) => e.ip);
  // Адрес самой ноды панель в `ips` не всегда повторяет, а он самый ожидаемый.
  const all = [node.address, ...fromPanel].filter(Boolean);
  return Array.from(new Set(all));
}

/** Сетевые интерфейсы узла; служебный loopback предлагать бессмысленно. */
export function suggestedInterfaces(node: NodeInfo): string[] {
  return (node.system?.info?.networkInterfaces ?? []).filter((name) => name !== 'lo');
}
