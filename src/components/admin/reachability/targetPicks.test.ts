import { describe, expect, it } from 'vitest';
import { pickByPurpose } from './targetPicks';

describe('pickByPurpose', () => {
  it('отдаёт только цели с нужным назначением, новым массивом', () => {
    const items = [
      { id: 1, purpose: 'bs' as const },
      { id: 2, purpose: 'regular' as const },
      { id: 3, purpose: 'bs' as const },
    ];
    expect(pickByPurpose(items, 'bs').map((i) => i.id)).toEqual([1, 3]);
    expect(pickByPurpose(items, 'unknown')).toEqual([]);
    expect(items).toHaveLength(3);
  });
});
