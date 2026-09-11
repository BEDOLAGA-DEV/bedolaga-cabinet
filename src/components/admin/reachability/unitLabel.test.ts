import { describe, expect, it } from 'vitest';
import type { Leg } from '@/api/reachability';
import { unit } from './testUtils';
import { unitLabel, unitNames } from './unitLabel';

/** Подпись симки в строке таблицы результата: код для иконки, имя оператора, округ. */

const leg = (patch: Partial<Leg>): Leg => ({
  id: 1,
  target_key: 'host.example:443',
  target_kind: 'host',
  target_ref: null,
  op_key: 'mts|цфо|on',
  operator: null,
  region: null,
  dpi: 'on',
  verdict: 'reachable',
  matches_expectation: true,
  raw: null,
  checked_at: '2026-09-05T12:00:00Z',
  ...patch,
});

describe('unitLabel', () => {
  it('имя и округ из каталога симок', () => {
    const catalog = [{ ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' }];
    expect(unitLabel(leg({}), catalog)).toEqual({ code: 'mts', name: 'МТС', region: 'ЦФО' });
  });

  it('симки нет в каталоге — код из ключа, округ из ключа заглавными', () => {
    expect(unitLabel(leg({ op_key: 'yota|уфо|off' }), [])).toEqual({
      code: 'yota',
      name: 'yota',
      region: 'УФО',
    });
  });

  it('симки нет в каталоге — запасное имя из ответа, а не код', () => {
    expect(unitLabel(leg({ op_key: 'svyaz|цфо|on' }), [], 'Связь').name).toBe('Связь');
    const catalog = [{ ...unit('svyaz|цфо|on', 'on', 'цфо'), name: 'Связь Сразу' }];
    expect(unitLabel(leg({ op_key: 'svyaz|цфо|on' }), catalog, 'Связь').name).toBe('Связь Сразу');
  });

  it('оператор и округ из лега важнее каталога и ключа', () => {
    const catalog = [{ ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' }];
    expect(unitLabel(leg({ operator: 'mts2', region: 'пфо' }), catalog)).toEqual({
      code: 'mts2',
      name: 'МТС',
      region: 'ПФО',
    });
  });
});

describe('unitNames', () => {
  it('имена с округом из каталога через запятую, неизвестные — ключом', () => {
    const catalog = [{ ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' }];
    expect(unitNames(['mts|цфо|on', 'yota|уфо|off'], catalog)).toBe('МТС ЦФО, yota|уфо|off');
    expect(unitNames([], catalog)).toBe('');
  });
});
