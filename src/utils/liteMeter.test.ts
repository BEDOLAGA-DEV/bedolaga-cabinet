import { describe, expect, it } from 'vitest';
import { liteMeterColor, liteMeterWidth } from './liteMeter';
import { getTrafficZone } from './trafficZone';

/**
 * На простом экране цвет — сообщение, а не украшение. Пока трафика хватает,
 * шкала обязана оставаться в акценте оператора: пожелтевшая на половине шкала
 * читается как поломка. Пороги при этом общие с полным видом — иначе «опасно»
 * в двух видах кабинета значит разное.
 */

describe('liteMeterColor', () => {
  it('держит акцент, пока трафика хватает', () => {
    for (const percent of [0, 1, 49, 50, 60, 74.9]) {
      expect(liteMeterColor(percent)).toBe('rgb(var(--color-accent-500))');
    }
  });

  it('с 75% отдаёт цвет зоны, а не свой собственный', () => {
    expect(liteMeterColor(75)).toBe(getTrafficZone(75).mainVar);
    expect(liteMeterColor(89)).toBe(getTrafficZone(89).mainVar);
  });

  it('на пределе показывает критическую зону', () => {
    expect(liteMeterColor(90)).toBe(getTrafficZone(90).mainVar);
    expect(liteMeterColor(100)).toBe(getTrafficZone(100).mainVar);
    expect(liteMeterColor(140)).toBe(getTrafficZone(140).mainVar);
  });

  it('на нечисле не красит шкалу тревожно', () => {
    expect(liteMeterColor(Number.NaN)).toBe('rgb(var(--color-accent-500))');
  });
});

describe('liteMeterWidth', () => {
  it('повторяет процент в обычном диапазоне', () => {
    expect(liteMeterWidth(0)).toBe(0);
    expect(liteMeterWidth(37.5)).toBe(37.5);
    expect(liteMeterWidth(100)).toBe(100);
  });

  it('не вылезает за шкалу при перерасходе', () => {
    expect(liteMeterWidth(150)).toBe(100);
  });

  it('отрицательное и нечисло считает пустой шкалой', () => {
    expect(liteMeterWidth(-10)).toBe(0);
    expect(liteMeterWidth(Number.NaN)).toBe(0);
  });
});
