import { describe, expect, it } from 'vitest';
import { tierProgressText } from './Referral';

/**
 * The rank line on the partner screen had no test at all: it could be switched
 * off entirely, or switched ON for everyone — including chain mode, where every
 * user would then be told "no rank reached yet" about a concept their programme
 * does not have.
 */

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key;

const terms = (over: Partial<Parameters<typeof tierProgressText>[0]> = {}) => ({
  levels_mode: 'tiers' as const,
  tier_current_level: 2,
  tier_next_level: 3,
  tier_next_remaining: 13,
  ...over,
});

describe('строка ранга на экране партнёра', () => {
  it('показывает расстояние до следующего ранга', () => {
    expect(tierProgressText(terms(), t)).toBe('referral.terms.tierNext:{"level":3,"count":13}');
  });

  it('говорит, что ранг ещё не открыт', () => {
    expect(tierProgressText(terms({ tier_current_level: null }), t)).toBe(
      'referral.terms.tierNone',
    );
  });

  it('на верхнем ранге не рисует ничего — иначе остаётся пустой абзац', () => {
    expect(tierProgressText(terms({ tier_next_level: null }), t)).toBeNull();
  });

  it('в режиме цепочки молчит: рангов там не существует', () => {
    expect(
      tierProgressText(terms({ levels_mode: 'chain', tier_current_level: null }), t),
    ).toBeNull();
  });
});
