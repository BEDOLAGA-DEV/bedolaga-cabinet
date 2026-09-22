import { describe, expect, it } from 'vitest';
import { tariffAction, type TariffActionInput } from './tariffAction';
import type { PurchaseOptions, Subscription, Tariff } from '../../../types';

/**
 * Ветвление платёжное: «продлить», «перейти на тариф», «сменить» и «купить»
 * уводят в разные сценарии и списывают разные суммы. Тесты фиксируют порядок
 * проверок — именно он решает, что увидит человек, у которого совпало
 * несколько условий сразу.
 */

const activeSub = {
  id: 1,
  tariff_id: 10,
  is_trial: false,
  is_active: true,
  is_limited: false,
  is_daily: false,
  device_limit: 5,
  requires_tariff_selection: false,
} as unknown as Subscription;

function ask(over: Partial<TariffActionInput> = {}) {
  return tariffAction({
    tariff: { id: 99, is_current: false } as Pick<Tariff, 'id' | 'is_current'>,
    subscription: activeSub,
    purchaseOptions: { sales_mode: 'tariffs' } as unknown as PurchaseOptions,
    isTariffsMode: true,
    isMultiTariff: false,
    ...over,
  });
}

describe('tariffAction', () => {
  it('без подписки — обычная покупка', () => {
    expect(ask({ subscription: null })).toBe('purchase');
  });

  it('текущий тариф продлевают', () => {
    expect(ask({ tariff: { id: 10, is_current: false } })).toBe('extend');
    expect(ask({ tariff: { id: 99, is_current: true } })).toBe('extend');
  });

  it('текущий посуточный не продлевают — он списывается сам', () => {
    expect(
      ask({
        tariff: { id: 10, is_current: false },
        subscription: { ...activeSub, is_daily: true } as Subscription,
      }),
    ).toBe('current-daily');
  });

  it('старую подписку переводят на тариф, а не «меняют»', () => {
    const legacy = { ...activeSub, requires_tariff_selection: true } as Subscription;
    expect(ask({ subscription: legacy })).toBe('moveToTariff');
  });

  it('текущий тариф важнее старой подписки', () => {
    const legacy = { ...activeSub, requires_tariff_selection: true } as Subscription;
    expect(ask({ subscription: legacy, tariff: { id: 10, is_current: false } })).toBe('extend');
  });

  it('живая подписка на тарифе — смена с пересчётом', () => {
    expect(ask()).toBe('switch');
  });

  it('исчерпавшая трафик подписка тоже меняется', () => {
    expect(
      ask({
        subscription: { ...activeSub, is_active: false, is_limited: true } as Subscription,
      }),
    ).toBe('switch');
  });

  it('пробную не меняют — покупают', () => {
    expect(ask({ subscription: { ...activeSub, is_trial: true } as Subscription })).toBe(
      'purchase',
    );
  });

  it('истёкшую не меняют — покупают', () => {
    expect(
      ask({
        purchaseOptions: {
          sales_mode: 'tariffs',
          subscription_is_expired: true,
        } as unknown as PurchaseOptions,
      }),
    ).toBe('purchase');
  });

  it('с бесплатного тарифа пересчёт запрещён бэкендом — покупают', () => {
    expect(
      ask({
        purchaseOptions: {
          sales_mode: 'tariffs',
          subscription_on_free_tariff: true,
        } as unknown as PurchaseOptions,
      }),
    ).toBe('purchase');
  });

  it('в мультитарифе меняют не тариф, а покупают ещё один', () => {
    expect(ask({ isMultiTariff: true })).toBe('purchase');
  });

  it('вне режима тарифов флаги истечения не учитываются', () => {
    // subscription_is_expired приходит только в режиме тарифов; в классике
    // тот же ключ не должен превращать смену в покупку.
    expect(
      ask({
        isTariffsMode: false,
        purchaseOptions: {
          sales_mode: 'classic',
          subscription_is_expired: true,
        } as unknown as PurchaseOptions,
      }),
    ).toBe('switch');
  });

  it('без тарифа у подписки менять нечего', () => {
    expect(
      ask({ subscription: { ...activeSub, tariff_id: undefined } as unknown as Subscription }),
    ).toBe('purchase');
  });
});
