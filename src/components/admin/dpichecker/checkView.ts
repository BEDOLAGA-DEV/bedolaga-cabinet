import type { CheckResource, CheckRow, CheckType } from '@/api/dpichecker';

/**
 * Результат проверки словами — для людей, без кодов. Незнакомый код сервиса не показывается вовсе:
 * строка остаётся «доступно / недоступно» с задержкой, а не с загадочным «foo_bar».
 */

export type Verdict = 'available' | 'partial' | 'unavailable' | 'pending';

export function resourceVerdict(resource: CheckResource): Verdict {
  if (resource.total === 0) return 'pending';
  if (resource.ok_count === resource.total) return 'available';
  return resource.ok_count === 0 ? 'unavailable' : 'partial';
}

const CODE_KEYS: Record<string, string> = {
  https_upgrade_stub: 'httpsUpgradeStub',
  tls_handshake_failed: 'tlsHandshakeFailed',
  dns_failed: 'dnsFailed',
  timeout: 'timeout',
  connection_refused: 'connectionRefused',
  connection_reset: 'connectionReset',
  proxy_dead: 'proxyDead',
  untestable: 'untestable',
};

const CYRILLIC = /[А-Яа-яЁё]/;

export type RowNote = { key: string } | { text: string };

export function rowNote(checkType: CheckType, row: CheckRow): RowNote | null {
  if (row.ok) return null;
  if (row.internet_ok === false) return { key: 'noInternet' };
  const code = checkType === 'mtproto' ? row.reason : (row.error_code ?? row.reason);
  if (code && CODE_KEYS[code]) return { key: CODE_KEYS[code] };
  // Сервис иногда сам пишет причину по-русски («curl exit 28 (соединение не установлено)»).
  if (row.error && CYRILLIC.test(row.error)) return { text: row.error };
  return null;
}

export function sortRows(rows: CheckRow[]): CheckRow[] {
  return [...rows].sort(
    (a, b) => Number(a.ok) - Number(b.ok) || a.region.localeCompare(b.region, 'ru'),
  );
}

const RUNNING = new Set(['pending', 'active', 'submitting', 'running']);

export function isRunning(status: string): boolean {
  return RUNNING.has(status);
}
