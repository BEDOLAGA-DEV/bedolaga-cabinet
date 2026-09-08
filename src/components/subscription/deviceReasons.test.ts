import { describe, expect, it } from 'vitest';
import { deviceUnavailableText } from './deviceReasons';

/**
 * Причина «докупить/уменьшить устройства нельзя» приходит с сервера. Раньше это был
 * готовый текст на языке автора кода — в «Уменьшить лимит устройств» человек видел
 * «Already at minimum device limit» посреди русского интерфейса. Теперь сервер шлёт
 * машинный код, а текст берётся из локали; старый текст остаётся запасным для
 * кода, которого кабинет ещё не знает.
 */
const t = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as Parameters<typeof deviceUnavailableText>[0];

const FALLBACK = 'subscription.additionalOptions.reduceUnavailable';

describe('deviceUnavailableText', () => {
  it('минимум тарифа — из локали, а не сырой английский', () => {
    const text = deviceUnavailableText(
      t,
      {
        available: false,
        reason: 'Already at minimum device limit',
        reason_code: 'at_minimum',
        min_device_limit: 1,
      },
      FALLBACK,
    );
    expect(text).toBe('subscription.additionalOptions.alreadyAtMinDeviceLimit');
  });

  it('коды с числом подставляют число', () => {
    expect(
      deviceUnavailableText(
        t,
        { reason_code: 'max_devices_reached', max_device_limit: 5 },
        FALLBACK,
      ),
    ).toBe('subscription.additionalOptions.reasons.maxDevicesReached:{"count":5}');
    expect(deviceUnavailableText(t, { reason_code: 'can_add_limited', can_add: 2 }, FALLBACK)).toBe(
      'subscription.additionalOptions.reasons.canAddLimited:{"count":2}',
    );
  });

  it('остальные коды — свои ключи', () => {
    expect(deviceUnavailableText(t, { reason_code: 'no_subscription' }, FALLBACK)).toBe(
      'subscription.additionalOptions.reasons.noSubscription',
    );
    expect(deviceUnavailableText(t, { reason_code: 'no_active_subscription' }, FALLBACK)).toBe(
      'subscription.additionalOptions.reasons.noActiveSubscription',
    );
    expect(deviceUnavailableText(t, { reason_code: 'trial' }, FALLBACK)).toBe(
      'subscription.additionalOptions.reasons.trialNotAllowed',
    );
    expect(deviceUnavailableText(t, { reason_code: 'devices_unavailable' }, FALLBACK)).toBe(
      'subscription.additionalOptions.devicesUnavailable',
    );
  });

  it('незнакомый код — текст сервера, без текста — запасной ключ', () => {
    expect(
      deviceUnavailableText(t, { reason_code: 'brand_new', reason: 'Server says' }, FALLBACK),
    ).toBe('Server says');
    expect(deviceUnavailableText(t, { reason_code: 'brand_new' }, FALLBACK)).toBe(FALLBACK);
    expect(deviceUnavailableText(t, undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('старый сервер без кода — его текст как раньше', () => {
    expect(deviceUnavailableText(t, { reason: 'Докупка устройств недоступна' }, FALLBACK)).toBe(
      'Докупка устройств недоступна',
    );
  });
});
