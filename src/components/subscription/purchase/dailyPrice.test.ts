import { describe, expect, it } from 'vitest';
import { combinePromoDiscount } from '@/hooks/usePromoDiscount';
import { dailyPriceQuote } from './dailyPrice';

/**
 * Скидка промокода накладывается на цену ровно один раз — на клиенте, поверх
 * серверной цены с групповой скидкой. Для суточного тарифа сервер раньше уже
 * вкладывал промокод в daily_price_kopeks, а карточка накладывала его ещё раз:
 * при промокоде на 20 % человек видел −36 % (9,60 ₽ из 15 ₽), а экран активации —
 * честные 12 ₽. Теперь и карточка, и экран активации считают одной функцией.
 */
describe('combinePromoDiscount', () => {
  it('без скидок — цена как есть', () => {
    expect(combinePromoDiscount(1500, undefined, 0)).toEqual({
      price: 1500,
      original: null,
      percent: null,
      isPromoGroup: false,
    });
  });

  it('только промокод — процент промокода, зачёркнута исходная', () => {
    expect(combinePromoDiscount(1500, undefined, 20)).toEqual({
      price: 1200,
      original: 1500,
      percent: 20,
      isPromoGroup: false,
    });
  });

  it('группа и промокод — суммарный процент от исходной цены', () => {
    expect(combinePromoDiscount(1200, 1500, 20)).toEqual({
      price: 960,
      original: 1500,
      percent: 36,
      isPromoGroup: true,
    });
  });

  it('только группа — процент группы', () => {
    expect(combinePromoDiscount(1200, 1500, 0)).toEqual({
      price: 1200,
      original: 1500,
      percent: 20,
      isPromoGroup: true,
    });
  });
});

describe('dailyPriceQuote', () => {
  const apply = (price: number, original?: number | null) =>
    combinePromoDiscount(price, original, 20);

  it('суточный тариф с промокодом: 15 ₽ → 12 ₽, −20 %, один раз', () => {
    const quote = dailyPriceQuote({ daily_price_kopeks: 1500 }, apply);
    expect(quote).toEqual({ price: 1200, original: 1500, percent: 20, isPromoGroup: false });
  });

  it('серверная групповая скидка + промокод: 12 ₽ → 9,60 ₽, −36 % от 15 ₽', () => {
    const quote = dailyPriceQuote(
      { daily_price_kopeks: 1200, original_daily_price_kopeks: 1500 },
      apply,
    );
    expect(quote).toEqual({ price: 960, original: 1500, percent: 36, isPromoGroup: true });
  });

  it('нет суточной цены — null; запасной вариант — цена за день из кастомных дней', () => {
    expect(dailyPriceQuote({ daily_price_kopeks: 0 }, apply)).toBeNull();
    expect(dailyPriceQuote({ price_per_day_kopeks: 500 }, apply)?.price).toBe(400);
  });
});
