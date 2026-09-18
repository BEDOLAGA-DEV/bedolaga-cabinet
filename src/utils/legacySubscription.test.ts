import { describe, expect, it } from 'vitest';
import {
  needsTariff,
  planTitle,
  showsAutopayToggle,
  tariffSelectionPath,
} from './legacySubscription';

/**
 * Старая подписка: куплена в классике, тарифа нет, а оператор уже на тарифах.
 * Продлить её нельзя, автоплатёж для неё не работает — у неё один путь:
 * витрина тарифов, где выбранный тариф надевается на неё же. Признак
 * присылает бот (requires_tariff_selection), кабинет по режиму не гадает.
 */

describe('needsTariff', () => {
  it('верен только по явному признаку от бота', () => {
    expect(needsTariff({ requires_tariff_selection: true })).toBe(true);
    expect(needsTariff({ requires_tariff_selection: false })).toBe(false);
    expect(needsTariff({})).toBe(false);
    expect(needsTariff(null)).toBe(false);
    expect(needsTariff(undefined)).toBe(false);
  });
});

describe('tariffSelectionPath', () => {
  it('ведёт на витрину тарифов с этой подпиской', () => {
    expect(tariffSelectionPath(42)).toBe('/subscription/purchase?subscriptionId=42');
  });
});

describe('showsAutopayToggle', () => {
  it('прячет тумблер у старой подписки, как у пробной и суточной', () => {
    expect(
      showsAutopayToggle({ is_trial: false, is_daily: false, requires_tariff_selection: true }),
    ).toBe(false);
    expect(showsAutopayToggle({ is_trial: true, is_daily: false })).toBe(false);
    expect(showsAutopayToggle({ is_trial: false, is_daily: true })).toBe(false);
  });

  it('показывает тумблер обычной подписке с тарифом', () => {
    expect(
      showsAutopayToggle({ is_trial: false, is_daily: false, requires_tariff_selection: false }),
    ).toBe(true);
    expect(showsAutopayToggle({ is_trial: false })).toBe(true);
  });
});

describe('planTitle', () => {
  const t = (key: string) => key;

  it('у старой подписки честно пишет «без тарифа», а не «текущий тариф»', () => {
    expect(planTitle({ tariff_name: undefined, requires_tariff_selection: true }, t)).toBe(
      'subscription.legacy.noTariff',
    );
  });

  it('обычной подписке отдаёт имя тарифа или прежнюю заглушку', () => {
    expect(planTitle({ tariff_name: 'Базовый', requires_tariff_selection: false }, t)).toBe(
      'Базовый',
    );
    expect(planTitle({ tariff_name: undefined }, t)).toBe('subscription.currentPlan');
  });
});
