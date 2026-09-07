import { describe, expect, it } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';
import { unit } from './testUtils';
import {
  activeQuickPick,
  dpiForSelection,
  mergeKeys,
  pickUnits,
  recallSelection,
  rememberSelection,
  toggleKey,
  unitsByMode,
} from './unitSelection';

const UNITS = [
  { ...unit('tele2|цфо|on', 'on', 'cfo'), name: 'Tele2' },
  { ...unit('mts|цфо|off', 'off', 'cfo'), name: 'МТС' },
  { ...unit('mts|пфо|on', 'on', 'pfo'), name: 'МТС' },
  { ...unit('beeline|цфо|on', 'on', 'cfo'), name: 'Билайн' },
  { ...unit('yota|уфо|off', 'off', 'urfo', false), name: 'Yota' },
];

describe('toggleKey / mergeKeys / pickUnits', () => {
  it('toggleKey возвращает новый массив', () => {
    const selected = ['a'];
    expect(toggleKey(selected, 'b')).toEqual(['a', 'b']);
    expect(toggleKey(['a', 'b'], 'a')).toEqual(['b']);
    expect(selected).toEqual(['a']);
  });
  it('pickUnits берёт только доступные симки нужного режима', () => {
    expect(pickUnits(UNITS, 'on')).toEqual(['tele2|цфо|on', 'mts|пфо|on', 'beeline|цфо|on']);
    expect(pickUnits(UNITS, 'off')).toEqual(['mts|цфо|off']);
  });
  it('mergeKeys объединяет без дублей и не трогает исходный массив', () => {
    const selected = ['a', 'b'];
    expect(mergeKeys(selected, ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(selected).toEqual(['a', 'b']);
  });
});

/** Сетка симок: две группы по Белому списку, внутри — по оператору и округу; без связи не показываем. */
describe('unitsByMode', () => {
  it('делит доступные симки на «с Белым списком» и «без», сортируя по оператору и округу', () => {
    const groups = unitsByMode(UNITS);
    expect(groups.bs.map((u) => u.op_key)).toEqual([
      'beeline|цфо|on',
      'mts|пфо|on',
      'tele2|цфо|on',
    ]);
    expect(groups.regular.map((u) => u.op_key)).toEqual(['mts|цфо|off']);
  });
});

/** Быстрый выбор подсвечивается, только когда выбор совпадает с ним целиком. */
describe('activeQuickPick', () => {
  it('узнаёт «с Белым списком», «без» и «все» независимо от порядка ключей', () => {
    expect(activeQuickPick(UNITS, ['mts|пфо|on', 'beeline|цфо|on', 'tele2|цфо|on'])).toBe('bs');
    expect(activeQuickPick(UNITS, ['mts|цфо|off'])).toBe('regular');
    expect(
      activeQuickPick(UNITS, ['mts|цфо|off', 'tele2|цфо|on', 'mts|пфо|on', 'beeline|цфо|on']),
    ).toBe('all');
  });
  it('часть набора или пустой выбор — ничего не подсвечено', () => {
    expect(activeQuickPick(UNITS, ['tele2|цфо|on'])).toBeNull();
    expect(activeQuickPick(UNITS, [])).toBeNull();
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
