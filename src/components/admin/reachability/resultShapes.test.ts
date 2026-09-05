import { describe, expect, it } from 'vitest';
import type { Leg } from '@/api/reachability';
import { probeMatrix, scanSummary, vlessLegView } from './resultShapes';

const leg = (target_key: string, op_key: string, raw: Record<string, unknown> = {}): Leg => ({
  id: 1,
  target_key,
  target_kind: 'host',
  target_ref: null,
  op_key,
  operator: op_key.split('|')[0],
  region: 'ЦФО',
  dpi: 'on',
  verdict: 'reachable',
  matches_expectation: true,
  raw,
  checked_at: '2026-09-05T12:00:00Z',
});

describe('probeMatrix', () => {
  it('строки и столбцы в порядке появления, ячейки по паре', () => {
    const legs = [leg('a', 'mts|цфо|on'), leg('b', 'mts|цфо|on'), leg('a', 'tele2|цфо|on')];
    const matrix = probeMatrix(legs);
    expect(matrix.rows).toEqual(['a', 'b']);
    expect(matrix.cols).toEqual(['mts|цфо|on', 'tele2|цфо|on']);
    expect(matrix.cells.a['tele2|цфо|on']).toBe(legs[2]);
    expect(matrix.cells.b['tele2|цфо|on']).toBeUndefined();
  });
});

describe('vlessLegView', () => {
  it('собирает витрину лега из сырого ответа', () => {
    const view = vlessLegView(
      leg('eu.example:443', 'tele2|цфо|on', {
        server_name: '🇩🇪 Germany',
        tunnel_up: true,
        targets: [{ ok: true }, { ok: false }, { ok: true }],
        tcp_latency_ms: 82,
        used_core: 'stable',
        fail_reason: 'zombie_tcp',
        diagnosis: 'DPI после TLS',
      }),
    );
    expect(view).toEqual({
      server: '🇩🇪 Germany',
      opKey: 'tele2|цфо|on',
      verdict: 'reachable',
      matches: true,
      tunnelUp: true,
      targetsOk: 2,
      targetsTotal: 3,
      latencyMs: 82,
      core: 'stable',
      failReason: 'zombie_tcp',
      diagnosis: 'DPI после TLS',
    });
  });

  it('без сырых данных — подпись из ключа цели и пустые поля', () => {
    const view = vlessLegView(leg('eu.example:443', 'mts|цфо|on', {}));
    expect(view.server).toBe('eu.example:443');
    expect([view.tunnelUp, view.latencyMs, view.core, view.failReason, view.diagnosis]).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
    expect([view.targetsOk, view.targetsTotal]).toEqual([0, 0]);
  });
});

describe('scanSummary', () => {
  const result = {
    status: {
      result: {
        up_n: 2,
        total: 256,
        operators: ['mts|цфо|off', 'yota|цфо|on'],
        results: [
          {
            ip: '192.0.2.1',
            by_operator: {
              'mts|цфо|off': { icmp: true, tcp: false, sni: { 'a.example': false } },
              'yota|цфо|on': { icmp: true, tcp: true, sni: {} },
            },
          },
          { ip: '192.0.2.3', by_operator: { 'mts|цфо|off': { icmp: true, tcp: false, sni: {} } } },
        ],
      },
    },
  };

  it('считает живые адреса по симкам и отдаёт список IP', () => {
    const summary = scanSummary(result);
    expect(summary).not.toBeNull();
    expect([summary?.upN, summary?.total]).toEqual([2, 256]);
    expect(summary?.ips.map((item) => item.ip)).toEqual(['192.0.2.1', '192.0.2.3']);
    expect(summary?.aliveByUnit).toEqual({ 'mts|цфо|off': 2, 'yota|цфо|on': 1 });
    expect(summary?.ips[0].units['yota|цфо|on']).toEqual({ icmp: true, tcp: true, sni: {} });
  });

  it('без результата — null, мусор в results пропускается', () => {
    expect(scanSummary(null)).toBeNull();
    expect(scanSummary({ status: {} })).toBeNull();
    const dirty = scanSummary({
      status: { result: { up_n: 0, total: 256, results: [null, 5, { ip: 'x' }] } },
    });
    expect(dirty?.ips).toEqual([{ ip: 'x', units: {} }]);
    expect(dirty?.operators).toEqual([]);
  });
});
