import { describe, expect, it } from 'vitest';
import type { Pop } from '@/api/dpichecker';
import {
  byRegion,
  effectiveSelection,
  groupState,
  pickAll,
  pickOptimal,
  pickRandom,
  toggle,
  toggleGroup,
} from './popSelection';

const pops: Pop[] = [
  { id: 1, location: 'russia', region: 'Москва', operator: null, is_healthy: true },
  { id: 2, location: 'russia', region: 'Москва', operator: 'MTS', is_healthy: true },
  { id: 3, location: 'russia', region: 'Амурская обл.', operator: null, is_healthy: false },
  { id: 4, location: 'russia', region: 'Амурская обл.', operator: 'Megafon', is_healthy: true },
];

describe('выбор точек DPI//CHECKER', () => {
  it('нерабочую точку не выбрать ни кликом, ни оптимальным набором, ни «все»', () => {
    expect(toggle(new Set(), 3, pops).has(3)).toBe(false);
    expect([...pickOptimal([3, 4], pops)]).toEqual([4]);
    expect([...pickAll(pops)].sort()).toEqual([1, 2, 4]);
  });

  it('клик по выбранной снимает её', () => {
    expect(toggle(new Set([1]), 1, pops).has(1)).toBe(false);
  });

  it('в запуск уходят только рабочие точки, по порядку', () => {
    expect(effectiveSelection(new Set([4, 3, 1]), pops)).toEqual([1, 4]);
  });

  it('регион или округ: ничего → все → снять', () => {
    const moscow = [1, 2];
    expect(groupState(moscow, new Set(), pops)).toBe('none');
    expect(groupState(moscow, new Set([1]), pops)).toBe('part');
    const all = toggleGroup(moscow, new Set([1]), pops);
    expect(groupState(moscow, all, pops)).toBe('all');
    expect(groupState(moscow, toggleGroup(moscow, all, pops), pops)).toBe('none');
  });

  it('группа из одних нерабочих — «ничего», и выбрать её нельзя', () => {
    expect(groupState([3], new Set(), pops)).toBe('none');
    expect(toggleGroup([3], new Set(), pops).size).toBe(0);
  });

  it('случайные 10 — не больше рабочих и без повторов', () => {
    const pick = pickRandom(pops, 10, () => 0.5);
    expect(pick.size).toBe(3);
    expect(pick.has(3)).toBe(false);
  });

  it('поиск по оператору и региону без учёта регистра, регионы по алфавиту', () => {
    expect(byRegion(pops, 'mts').map((g) => g.region)).toEqual(['Москва']);
    expect(byRegion(pops, 'АМУР').map((g) => g.region)).toEqual(['Амурская обл.']);
    const all = byRegion(pops, '');
    expect(all.map((g) => g.region)).toEqual(['Амурская обл.', 'Москва']);
    expect(all[0]).toMatchObject({ alive: 1 });
  });

  it('исходный выбор не меняется', () => {
    const sel = new Set([1]);
    toggle(sel, 2, pops);
    toggleGroup([1, 2], sel, pops);
    expect([...sel]).toEqual([1]);
  });
});
