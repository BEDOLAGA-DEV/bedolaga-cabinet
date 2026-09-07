import { describe, expect, it } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';
import { unit } from './testUtils';
import {
  allOf,
  districtState,
  dpiForSelection,
  groupByDistrict,
  mergeKeys,
  pickUnits,
  recallSelection,
  rememberSelection,
  toggleDistrict,
  toggleKey,
} from './unitSelection';

const UNITS = [
  unit('mts|цфо|off', 'off', 'cfo'),
  unit('mts|пфо|on', 'on', 'pfo'),
  unit('tele2|цфо|on', 'on', 'cfo'),
  unit('yota|уфо|off', 'off', 'urfo', false),
  unit('yota|цфо|on', 'on', 'cfo', false),
];

describe('toggleKey / mergeKeys / pickUnits / allOf', () => {
  it('toggleKey возвращает новый массив', () => {
    const selected = ['a'];
    expect(toggleKey(selected, 'b')).toEqual(['a', 'b']);
    expect(toggleKey(['a', 'b'], 'a')).toEqual(['b']);
    expect(selected).toEqual(['a']);
  });
  it('pickUnits берёт только доступные симки нужного режима', () => {
    expect(pickUnits(UNITS, 'on')).toEqual(['mts|пфо|on', 'tele2|цфо|on']);
    expect(pickUnits(UNITS, 'off')).toEqual(['mts|цфо|off']);
  });
  it('mergeKeys объединяет без дублей и не трогает исходный массив', () => {
    const selected = ['a', 'b'];
    expect(mergeKeys(selected, ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(selected).toEqual(['a', 'b']);
  });
  it('allOf: все ключи набора выбраны; пустой набор — нет', () => {
    expect(allOf(['a', 'b'], ['b', 'a', 'c'])).toBe(true);
    expect(allOf(['a', 'b'], ['a'])).toBe(false);
    expect(allOf([], ['a'])).toBe(false);
  });
});

/** Округа как на bsbord.com: в порядке каталога, счёт и отметка только по доступным симкам. */
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
    expect(districtState(cfo, ['mts|цфо|off', 'tele2|цфо|on'])).toBe('all');
    expect(toggleDistrict(['x'], cfo)).toEqual(['x', 'mts|цфо|off', 'tele2|цфо|on']);
    expect(toggleDistrict(['x', 'mts|цфо|off', 'tele2|цфо|on'], cfo)).toEqual(['x']);
    // в УФО единственная симка без связи — отмечать нечего
    expect(districtState(urfo, [])).toBe('none');
    expect(toggleDistrict([], urfo)).toEqual([]);
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

describe('dpiForSelection', () => {
  it('режим выводится из выбранных симок: все с БС → on, все без → off, смесь → any', () => {
    expect(dpiForSelection(UNITS, ['mts|пфо|on', 'tele2|цфо|on'])).toBe('on');
    expect(dpiForSelection(UNITS, ['mts|цфо|off'])).toBe('off');
    expect(dpiForSelection(UNITS, ['mts|цфо|off', 'tele2|цфо|on'])).toBe('any');
    expect(dpiForSelection(UNITS, [])).toBe('any');
  });
});
