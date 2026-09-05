import { describe, expect, it } from 'vitest';
import { OPERATOR_ICONS, operatorCode, operatorIconUrl } from './operatorIcons';

/** Иконки операторов из src/assets/operators — по коду оператора из op_key. */

const KNOWN = [
  'beeline',
  'dobro',
  'letai',
  'megafon',
  'mts',
  'rtk',
  'sberm',
  'svyaz1',
  't-mobile',
  'tele2',
  'volna',
  'winmobile',
  'yota',
];

describe('operatorIcons', () => {
  it('в наборе есть иконка для каждого известного оператора', () => {
    expect(Object.keys(OPERATOR_ICONS).sort()).toEqual([...KNOWN].sort());
    for (const code of KNOWN) expect(typeof operatorIconUrl(code)).toBe('string');
  });

  it('код ищется без учёта регистра, неизвестный и пустой — null', () => {
    expect(operatorIconUrl('MTS')).toBe(operatorIconUrl('mts'));
    expect(operatorIconUrl('unknown-op')).toBeNull();
    expect(operatorIconUrl(null)).toBeNull();
    expect(operatorIconUrl('')).toBeNull();
  });

  it('operatorCode берёт оператора из op_key', () => {
    expect(operatorCode('t-mobile|уфо|on')).toBe('t-mobile');
    expect(operatorCode('mts')).toBe('mts');
  });
});
