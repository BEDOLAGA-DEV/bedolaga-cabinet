import { describe, expect, it } from 'vitest';
import type { Subscription } from '@/types';
import { homeKind, homeState, renewPath, tariffPath } from './homeState';

const future = new Date(Date.now() + 20 * 86_400_000).toISOString();

function sub(over: Partial<Subscription> = {}): Subscription {
  return {
    id: 7,
    status: 'active',
    is_trial: false,
    end_date: future,
    days_left: 20,
    hours_left: 0,
    traffic_limit_gb: 100,
    traffic_used_gb: 10,
    traffic_used_percent: 10,
    device_limit: 5,
    autopay_enabled: true,
    autopay_days_before: 1,
    is_active: true,
    is_expired: false,
    is_limited: false,
    tariff_id: 3,
    tariff_name: 'Стандарт',
    subscription_url: 'https://x',
    ...over,
  } as Subscription;
}

const opts = { trialAvailable: false, atDeviceLimit: false };

describe('homeKind', () => {
  it.each<[Partial<Subscription>, string]>([
    [{}, 'active'],
    [{ days_left: 3 }, 'expiring'],
    [{ days_left: 0, hours_left: 5 }, 'expiring'],
    [{ is_trial: true, days_left: 1 }, 'trial'],
    [{ is_limited: true }, 'limited'],
    [{ is_expired: true, is_active: false }, 'expired'],
    [{ status: 'disabled' }, 'expired'],
  ])('%o → %s', (over, kind) => {
    expect(homeKind(sub(over))).toBe(kind);
  });

  it('no subscription → none', () => {
    expect(homeKind(null)).toBe('none');
  });
});

describe('homeState', () => {
  it('active: connect a device, accent tone, nothing else', () => {
    const s = homeState(sub(), opts);
    expect(s.tone).toBe('accent');
    expect(s.primary).toEqual({ label: 'connect', to: '/connection?sub=7' });
    expect(s.secondary).toBeNull();
  });

  it('active at device limit: connect leads to the devices block instead', () => {
    const s = homeState(sub(), { ...opts, atDeviceLimit: true });
    expect(s.primary.to).toBe('/subscriptions/7#devices');
  });

  it('expiring with autopay off: renew + autopay highlight on subscription page', () => {
    const s = homeState(sub({ days_left: 2, autopay_enabled: false }), opts);
    expect(s.tone).toBe('warning');
    expect(s.primary).toEqual({ label: 'renew', to: '/subscriptions/7/renew' });
    expect(s.secondary).toEqual({ label: 'autopay', to: '/subscriptions/7#autopay' });
  });

  it('expiring with autopay on: offers changing the plan instead', () => {
    const s = homeState(sub({ days_left: 2, autopay_enabled: true }), opts);
    expect(s.secondary).toEqual({
      label: 'switchTariff',
      to: '/subscription/purchase?subscriptionId=7',
    });
  });

  it('expired: error tone, renew goes to purchase', () => {
    const s = homeState(sub({ is_expired: true, is_active: false }), opts);
    expect(s.tone).toBe('error');
    expect(s.primary.to).toBe('/subscription/purchase');
  });

  it('legacy subscription without tariff: renew goes to its tariff showcase', () => {
    const legacy = sub({ tariff_id: undefined, requires_tariff_selection: true });
    expect(renewPath(legacy)).toBe('/subscription/purchase?subscriptionId=7');
  });

  it('trial: connect + buy a plan', () => {
    const s = homeState(sub({ is_trial: true }), opts);
    expect(s.primary.label).toBe('connect');
    expect(s.secondary).toEqual({ label: 'buyTariff', to: '/subscription/purchase' });
  });

  it('no subscription with free trial: activate in place, plans second', () => {
    const s = homeState(null, { ...opts, trialAvailable: true });
    expect(s.primary).toEqual({ label: 'tryFree', action: 'activateTrial' });
    expect(s.secondary?.to).toBe('/subscription/purchase');
  });

  it('no subscription without trial: plans only', () => {
    const s = homeState(null, opts);
    expect(s.primary).toEqual({ label: 'plans', to: '/subscription/purchase' });
    expect(s.secondary).toBeNull();
  });

  it('traffic tile leads to changing the plan when possible', () => {
    expect(tariffPath(sub())).toBe('/subscription/purchase?subscriptionId=7');
    expect(tariffPath(sub({ is_trial: true }))).toBe('/subscription/purchase');
  });
});
