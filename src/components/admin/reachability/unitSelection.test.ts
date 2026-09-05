import { describe, expect, it } from 'vitest';
import type { Unit } from '@/api/reachability';
import { resetSafeStorage } from '@/utils/safeStorage';
import {
  defaultDpiFor,
  districtState,
  dpiForSelection,
  filterUnits,
  groupByDistrict,
  groupByOperator,
  groupState,
  mergeKeys,
  pickUnits,
  recallSelection,
  regionsOf,
  rememberSelection,
  toggleDistrict,
  toggleGroup,
  toggleKey,
} from './unitSelection';

const unit = (op_key: string, dpi: 'on' | 'off', region_code: string, probeable = true): Unit => ({
  op_key,
  operator: op_key.split('|')[0],
  name: op_key.split('|')[0].toUpperCase(),
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
  unit('yota|цфо|on', 'on', 'cfo', false),
];

describe('filterUnits', () => {
  it('фильтрует по режиму Белого списка и округу', () => {
    expect(filterUnits(UNITS, { dpi: 'on', region: null }).map((u) => u.op_key)).toEqual([
      'mts|пфо|on',
      'tele2|цфо|on',
      'yota|цфо|on',
    ]);
    expect(filterUnits(UNITS, { dpi: 'any', region: 'cfo' }).map((u) => u.op_key)).toEqual([
      'mts|цфо|off',
      'tele2|цфо|on',
      'yota|цфо|on',
    ]);
    expect(filterUnits(UNITS, { dpi: 'any', region: null })).toHaveLength(5);
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

describe('быстрый выбор симок', () => {
  it('pickUnits берёт только доступные симки нужного режима', () => {
    expect(pickUnits(UNITS, 'on')).toEqual(['mts|пфо|on', 'tele2|цфо|on']);
    expect(pickUnits(UNITS, 'off')).toEqual(['mts|цфо|off']);
  });
  it('mergeKeys объединяет без дублей и не трогает исходный массив', () => {
    const selected = ['a', 'b'];
    expect(mergeKeys(selected, ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(selected).toEqual(['a', 'b']);
  });
});

describe('группы по оператору', () => {
  it('groupByOperator сохраняет порядок первого появления', () => {
    expect(groupByOperator(UNITS).map((g) => [g.operator, g.units.length])).toEqual([
      ['MTS', 2],
      ['TELE2', 1],
      ['YOTA', 2],
    ]);
  });
  it('groupState считает только доступные симки', () => {
    const [mts, , yota] = groupByOperator(UNITS);
    expect(groupState(mts, [])).toBe('none');
    expect(groupState(mts, ['mts|цфо|off'])).toBe('some');
    expect(groupState(mts, ['mts|цфо|off', 'mts|пфо|on'])).toBe('all');
    // у yota нет доступных симок — отмечать нечего
    expect(groupState(yota, [])).toBe('none');
  });
  it('toggleGroup отмечает все доступные, а при полном выборе снимает группу', () => {
    const [mts] = groupByOperator(UNITS);
    expect(toggleGroup(['x'], mts)).toEqual(['x', 'mts|цфо|off', 'mts|пфо|on']);
    expect(toggleGroup(['x', 'mts|цфо|off'], mts)).toEqual(['x', 'mts|цфо|off', 'mts|пфо|on']);
    expect(toggleGroup(['x', 'mts|цфо|off', 'mts|пфо|on'], mts)).toEqual(['x']);
  });
});

describe('память последнего запуска', () => {
  it('recallSelection отдаёт то, что запомнили, и пустой список без записи', () => {
    resetSafeStorage();
    expect(recallSelection('probe')).toEqual([]);
    rememberSelection('probe', ['mts|пфо|on']);
    expect(recallSelection('probe')).toEqual(['mts|пфо|on']);
    expect(recallSelection('scan')).toEqual([]);
  });
});

describe('округа', () => {
  it('groupByDistrict группирует по коду округа в порядке появления', () => {
    expect(groupByDistrict(UNITS).map((d) => [d.code, d.label, d.units.length])).toEqual([
      ['cfo', 'CFO', 3],
      ['pfo', 'PFO', 1],
      ['urfo', 'URFO', 1],
    ]);
  });
  it('districtState и toggleDistrict считают только доступные симки', () => {
    const [cfo, , urfo] = groupByDistrict(UNITS);
    expect(districtState(cfo, [])).toBe('none');
    expect(districtState(cfo, ['mts|цфо|off'])).toBe('some');
    expect(toggleDistrict(['x'], cfo)).toEqual(['x', 'mts|цфо|off', 'tele2|цфо|on']);
    expect(toggleDistrict(['x', 'mts|цфо|off', 'tele2|цфо|on'], cfo)).toEqual(['x']);
    // в УФО обе симки недоступны — отмечать нечего
    expect(districtState(urfo, [])).toBe('none');
    expect(toggleDistrict([], urfo)).toEqual([]);
  });
});

describe('dpiForSelection', () => {
  it('режим выводится из выбранных симок: все с БС → on, все без → off, смесь → any', () => {
    expect(dpiForSelection(UNITS, ['mts|пфо|on', 'tele2|цфо|on'])).toBe('on');
    expect(dpiForSelection(UNITS, ['mts|цфо|off'])).toBe('off');
    expect(dpiForSelection(UNITS, ['mts|цфо|off', 'tele2|цфо|on'])).toBe('any');
    expect(dpiForSelection(UNITS, [])).toBe('any');
  });
});
