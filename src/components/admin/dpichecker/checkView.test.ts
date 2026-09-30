import { describe, expect, it } from 'vitest';
import type { CheckResource, CheckRow } from '@/api/dpichecker';
import { isRunning, resourceVerdict, rowNote, sortRows } from './checkView';

const row = (over: Partial<CheckRow> = {}): CheckRow => ({
  pop_id: 1,
  region: 'Москва',
  ok: true,
  latency_ms: 100,
  speeds: [],
  error: null,
  reason: null,
  verdict: null,
  error_code: null,
  port_story: null,
  mode: null,
  internet_ok: null,
  proxy_dead: false,
  ...over,
});

const res = (ok: number, total: number): CheckResource => ({
  index: 0,
  name: 'x',
  value: null,
  server_ip: null,
  total,
  ok_count: ok,
  direct: null,
  rows: [],
});

describe('результат словами', () => {
  it('доступен / частично / недоступен / ещё нет данных', () => {
    expect(resourceVerdict(res(10, 10))).toBe('available');
    expect(resourceVerdict(res(3, 10))).toBe('partial');
    expect(resourceVerdict(res(0, 10))).toBe('unavailable');
    expect(resourceVerdict(res(0, 0))).toBe('pending');
  });

  it('у точки без интернета — не блокировка', () => {
    expect(
      rowNote(
        'vpn',
        row({ ok: false, internet_ok: false, error: 'curl exit 28 (соединение не установлено)' }),
      ),
    ).toEqual({
      key: 'noInternet',
    });
  });

  it('текст ошибки сервиса показывается как есть, если он по-русски', () => {
    expect(
      rowNote(
        'vpn',
        row({ ok: false, internet_ok: true, error: 'curl exit 28 (соединение не установлено)' }),
      ),
    ).toEqual({
      text: 'curl exit 28 (соединение не установлено)',
    });
  });

  it('известные коды — ключом локали, незнакомые не показываются', () => {
    expect(rowNote('ip', row({ ok: false, error_code: 'https_upgrade_stub' }))).toEqual({
      key: 'httpsUpgradeStub',
    });
    expect(rowNote('mtproto', row({ ok: false, reason: 'tls_handshake_failed' }))).toEqual({
      key: 'tlsHandshakeFailed',
    });
    expect(rowNote('ip', row({ ok: false, error_code: 'brand_new_thing' }))).toBeNull();
    expect(rowNote('ip', row({ ok: true }))).toBeNull();
  });

  it('сначала недоступные, внутри — по региону', () => {
    const sorted = sortRows([
      row({ region: 'Б' }),
      row({ region: 'В', ok: false }),
      row({ region: 'А' }),
    ]);
    expect(sorted.map((r) => r.region)).toEqual(['В', 'А', 'Б']);
  });

  it('идёт, пока в очереди или в работе', () => {
    expect(isRunning('pending')).toBe(true);
    expect(isRunning('active')).toBe(true);
    expect(isRunning('submitting')).toBe(true);
    expect(isRunning('completed')).toBe(false);
    expect(isRunning('unknown')).toBe(false);
  });
});
