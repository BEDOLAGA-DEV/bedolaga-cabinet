import { describe, expect, it } from 'vitest';
import type { Leg } from '@/api/reachability';
import { groupLegsByTarget, probeCells, probeColumns } from './probeCells';

/** Таблица результата как в оригинале: столбцы — пробы, в ячейке точка и значение. */

const leg = (raw: Record<string, unknown>, targetKey = 't:443'): Leg =>
  ({
    id: 1,
    target_key: targetKey,
    op_key: 'mts|цфо|on',
    verdict: 'reachable',
    matches_expectation: null,
    raw,
  }) as unknown as Leg;

describe('probeColumns', () => {
  it('заказанные пробы плюс HTTP, если API добавил его сам; без запроса — по легам', () => {
    const legs = [leg({ icmp: null, tcp: { ok: true }, sni: null, http: { ok: true } })];
    expect(probeColumns({ probes: { icmp: false, tcp: true, sni: true }, legs })).toEqual([
      'tcp',
      'sni',
      'http',
    ]);
    expect(probeColumns({ probes: null, legs })).toEqual(['tcp', 'http']);
  });
});

describe('probeCells', () => {
  it('ICMP с задержкой, TCP с пометкой tls, SNI по одному имени, HTTP', () => {
    const cells = probeCells(
      leg({
        ok: true,
        icmp: { ok: true, rtt_avg_ms: 49.98 },
        tcp: { ok: false, received: 0, total: 1, verdict: 'refused' },
        tcp_is_tls: true,
        sni: [{ host: 'ads.x5.ru', ok: true, rtt_ms: 120 }],
        http: { ok: false, elapsed_ms: 2007 },
      }),
      ['icmp', 'tcp', 'sni', 'http'],
    );
    expect(cells.map((cell) => [cell.state, cell.value])).toEqual([
      ['ok', '50 ms'],
      ['down', '(tls)'],
      ['ok', '120 ms'],
      ['down', null],
    ]);
  });

  it('Multi-SNI даёт мини-точки и счёт, незаказанная проба — «—», ошибка лега — всё недоступно', () => {
    const multi = probeCells(
      leg({
        ok: true,
        sni: [{ ok: true }, { ok: false, verdict: 'blocked' }, { verdict: 'alive' }],
      }),
      ['sni', 'icmp'],
    );
    expect(multi[0]).toEqual({
      probe: 'sni',
      state: 'warn',
      value: '2/3',
      subs: [true, false, true],
    });
    expect(multi[1].state).toBe('na');
    const failed = probeCells(leg({ ok: false, error: 'modem lost' }), ['icmp', 'tcp']);
    expect(failed.map((cell) => cell.state)).toEqual(['down', 'down']);
  });
});

describe('groupLegsByTarget', () => {
  it('группирует по цели, сохраняя порядок', () => {
    const groups = groupLegsByTarget([leg({}, 'a'), leg({}, 'b'), leg({}, 'a')]);
    expect(groups.map((group) => [group.targetKey, group.legs.length])).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });
});
