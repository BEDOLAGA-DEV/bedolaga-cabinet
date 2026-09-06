import { describe, expect, it } from 'vitest';
import { autoUnitsFor, describeUnits } from './autoUnits';
import { unit } from './testUtils';

/** Симки выбираются сами по назначению целей; человек видит одну строку и «Изменить». */

const catalog = [
  unit('mts|цфо|on', 'on', 'цфо'),
  unit('tele2|цфо|on', 'on', 'цфо'),
  unit('yota|уфо|off', 'off', 'уфо'),
  { ...unit('dead|цфо|on', 'on', 'цфо'), probeable: false },
];

describe('autoUnitsFor', () => {
  it('есть цель под Белый список — все симки с ним', () => {
    expect(autoUnitsFor(['bs', 'regular'], catalog)).toEqual(['mts|цфо|on', 'tele2|цфо|on']);
  });

  it('только обычные цели — симки без Белого списка', () => {
    expect(autoUnitsFor(['regular'], catalog)).toEqual(['yota|уфо|off']);
  });

  it('назначение неизвестно — как под Белый список; целей нет — ничего', () => {
    expect(autoUnitsFor(['unknown'], catalog)).toEqual(['mts|цфо|on', 'tele2|цфо|on']);
    expect(autoUnitsFor([], catalog)).toEqual([]);
  });
});

describe('describeUnits', () => {
  it('считает выбранные симки с Белым списком и без', () => {
    expect(describeUnits(['mts|цфо|on', 'yota|уфо|off', 'нет|такой|on'], catalog)).toEqual({
      total: 2,
      bs: 1,
      regular: 1,
    });
  });
});
