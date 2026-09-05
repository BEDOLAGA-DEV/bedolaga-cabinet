import { describe, expect, it } from 'vitest';
import type { Unit } from '@/api/reachability';
import {
  defaultDpiFor,
  filterUnits,
  loadSelection,
  regionsOf,
  saveSelection,
  toggleKey,
} from './unitSelection';

const unit = (op_key: string, dpi: 'on' | 'off', region_code: string, probeable = true): Unit => ({
  op_key,
  operator: op_key.split('|')[0],
  name: op_key,
  region: region_code.toUpperCase(),
  region_code,
  dpi,
  channel_state: dpi === 'on' ? 'DPI_ON' : 'DPI_OFF',
  probeable,
  in_catalog: true,
});
const UNITS = [
  unit('mts|цфо|off', 'off', 'cfo'),
  unit('mts|пфо|on', 'on', 'pfo'),
  unit('tele2|цфо|on', 'on', 'cfo'),
  unit('yota|уфо|off', 'off', 'urfo', false),
];

describe('filterUnits', () => {
  it('фильтрует по режиму Белого списка и округу', () => {
    expect(filterUnits(UNITS, { dpi: 'on', region: null }).map((u) => u.op_key)).toEqual([
      'mts|пфо|on',
      'tele2|цфо|on',
    ]);
    expect(filterUnits(UNITS, { dpi: 'any', region: 'cfo' }).map((u) => u.op_key)).toEqual([
      'mts|цфо|off',
      'tele2|цфо|on',
    ]);
    expect(filterUnits(UNITS, { dpi: 'any', region: null })).toHaveLength(4);
  });
});

describe('regionsOf / toggleKey / defaultDpiFor', () => {
  it('округа уникальны и подписаны', () => {
    expect(regionsOf(UNITS)).toEqual([
      { code: 'cfo', label: 'CFO' },
      { code: 'pfo', label: 'PFO' },
      { code: 'urfo', label: 'URFO' },
    ]);
  });
  it('toggleKey возвращает новый массив', () => {
    const selected = ['a'];
    expect(toggleKey(selected, 'b')).toEqual(['a', 'b']);
    expect(toggleKey(['a', 'b'], 'a')).toEqual(['b']);
    expect(selected).toEqual(['a']);
  });
  it('назначение задаёт режим по умолчанию', () => {
    expect(defaultDpiFor(['bs'])).toBe('on');
    expect(defaultDpiFor(['regular'])).toBe('off');
    expect(defaultDpiFor(['regular', 'unknown'])).toBe('off');
    expect(defaultDpiFor(['bs', 'regular'])).toBe('on');
    expect(defaultDpiFor([])).toBe('on');
  });
});

describe('память выбора', () => {
  it('переживает отсутствие localStorage и мусор в нём', () => {
    saveSelection('probe', ['mts|пфо|on']);
    expect(loadSelection('probe')).toEqual(
      typeof localStorage === 'undefined' ? [] : ['mts|пфо|on'],
    );
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cabinet_reachability_units_scan', '{"not":"array"}');
      expect(loadSelection('scan')).toEqual([]);
      localStorage.setItem('cabinet_reachability_units_vless', 'garbage');
      expect(loadSelection('vless')).toEqual([]);
    }
  });
});
