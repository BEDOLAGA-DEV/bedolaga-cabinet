import { describe, expect, it } from 'vitest';
import { tooltipPlacement } from './GeoMapTooltip';

describe('tooltipPlacement', () => {
  it('в просторе — справа-снизу от курсора', () => {
    expect(tooltipPlacement({ x: 100, y: 100, width: 1000, height: 500 }, 70)).toEqual({
      left: 114,
      top: 114,
      maxWidth: 300,
    });
  });
  it('у правого и нижнего края — прижимается к краю, не уходя за него', () => {
    const placed = tooltipPlacement({ x: 950, y: 480, width: 1000, height: 500 }, 114);
    expect(placed.left).toBe(1000 - 300 - 6);
    expect(placed.top + 114).toBeLessThanOrEqual(500 - 6);
    expect(placed.top).toBeGreaterThanOrEqual(6);
  });
  it('на карте телефона подсказка не вылезает ни вправо, ни вниз', () => {
    const placed = tooltipPlacement({ x: 60, y: 150, width: 330, height: 180 }, 70);
    expect(placed.maxWidth).toBe(300);
    expect(placed.left + placed.maxWidth).toBeLessThanOrEqual(330 - 6);
    expect(placed.top).toBe(150 - 14 - 70);
  });
  it('карта уже подсказки — подсказка сужается до карты', () => {
    const placed = tooltipPlacement({ x: 10, y: 10, width: 200, height: 120 }, 70);
    expect(placed.maxWidth).toBe(200 - 12);
    expect(placed.left).toBe(6);
  });
});
