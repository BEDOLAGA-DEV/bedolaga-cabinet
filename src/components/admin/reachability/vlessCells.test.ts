import { describe, expect, it } from 'vitest';
import type { VlessLegView } from './resultShapes';
import { VLESS_COLUMNS, vlessCells } from './vlessCells';

/**
 * Ячейки таблицы VLESS-теста в стиле таблицы проб: туннель · цели · задержка · Xray · причина.
 * Точка — только там, где есть состояние; текст — моноширинный, как «(tls)» и «54 ms» в оригинале.
 */

const view = (patch: Partial<VlessLegView> = {}): VlessLegView => ({
  server: '🇩🇪 Germany',
  opKey: 'tele2|цфо|on',
  operatorName: 'Tele2',
  verdict: 'reachable',
  matches: true,
  cancelled: false,
  tunnelUp: true,
  targets: [true, false, true],
  latencyMs: 82,
  core: 'stable',
  failReason: 'zombie_tcp',
  diagnosis: 'DPI после TLS',
  ...patch,
});

const cores = { stable: '26.3.27', prerelease: '26.7.11' };

describe('vlessCells', () => {
  it('столбцы в фиксированном порядке', () => {
    expect(VLESS_COLUMNS).toEqual(['tunnel', 'targets', 'latency', 'core', 'reason']);
    expect(vlessCells(view(), cores).map((cell) => cell.key)).toEqual(VLESS_COLUMNS);
  });

  it('туннель — точка по tunnel_up, без значения', () => {
    const [up] = vlessCells(view({ tunnelUp: true }), cores);
    const [down] = vlessCells(view({ tunnelUp: false }), cores);
    const [unknown] = vlessCells(view({ tunnelUp: null }), cores);
    expect(up).toEqual({ key: 'tunnel', state: 'ok', value: null, subs: null, title: null });
    expect(down.state).toBe('down');
    expect(unknown.state).toBe('na');
  });

  it('цели — точка на каждую, счёт «ok/total», цвет по доле', () => {
    const [, partial] = vlessCells(view({ targets: [true, false, true] }), cores);
    const [, all] = vlessCells(view({ targets: [true, true] }), cores);
    const [, none] = vlessCells(view({ targets: [false, false, false, false, false] }), cores);
    const [, empty] = vlessCells(view({ targets: [] }), cores);
    expect(partial).toEqual({
      key: 'targets',
      state: 'warn',
      value: '2/3',
      subs: [true, false, true],
      title: null,
    });
    expect([all.state, all.value]).toEqual(['ok', '2/2']);
    expect([none.state, none.value]).toEqual(['down', '0/5']);
    expect([empty.state, empty.value, empty.subs]).toEqual(['na', null, null]);
  });

  it('задержка и ядро — текст без точки, версия ядра по справочнику', () => {
    const [, , latency, core] = vlessCells(view(), cores);
    expect(latency).toEqual({
      key: 'latency',
      state: null,
      value: '82 ms',
      subs: null,
      title: null,
    });
    expect(core).toEqual({ key: 'core', state: null, value: '26.3.27', subs: null, title: null });
    const [, , noLatency, unknownCore] = vlessCells(
      view({ latencyMs: null, core: 'custom' }),
      undefined,
    );
    expect(noLatency.value).toBeNull();
    expect(unknownCore.value).toBe('custom');
  });

  it('причина — код с диагнозом в подсказке; без кода подсказка остаётся', () => {
    const [, , , , reason] = vlessCells(view(), cores);
    expect(reason).toEqual({
      key: 'reason',
      state: null,
      value: 'zombie_tcp',
      subs: null,
      title: 'DPI после TLS',
    });
    const [, , , , clean] = vlessCells(
      view({ failReason: null, diagnosis: 'Туннель работает' }),
      cores,
    );
    expect([clean.value, clean.title]).toEqual([null, 'Туннель работает']);
  });

  it('отменённый лег — пустые точки и без чисел, причина остаётся', () => {
    const cells = vlessCells(
      view({
        cancelled: true,
        verdict: 'cancelled',
        tunnelUp: false,
        targets: [false, false],
        latencyMs: 0,
        failReason: 'cancelled',
        diagnosis: 'Проверка отменена',
      }),
      cores,
    );
    expect(cells.map((cell) => [cell.state, cell.value])).toEqual([
      ['na', null],
      ['na', null],
      [null, null],
      [null, null],
      [null, 'cancelled'],
    ]);
  });
});
