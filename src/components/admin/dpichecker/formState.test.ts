import { describe, expect, it } from 'vitest';
import { activeTargets, canPay, fromPanel, fromParse } from './formState';

describe('состояние формы проверки', () => {
  it('VPN: ключи подписки с именами, UDP-ключ выключен и не включается', () => {
    const parsed = fromParse('vpn', {
      status: 'ok',
      keys: [
        {
          uri: 'vless://a',
          host: 'fi.example',
          name: '🇫🇮 Finland',
          group: '🇫🇮 Finland',
          udp_only: false,
          hy2: false,
        },
        {
          uri: 'hysteria2://b',
          host: 'de.example',
          name: 'DE',
          group: 'Hy',
          udp_only: true,
          hy2: true,
        },
      ],
    });
    expect(parsed.resources).toEqual([
      { value: 'vless://a', name: '🇫🇮 Finland', on: true },
      { value: 'hysteria2://b', name: 'DE · Hy', on: false, disabledReason: 'udp_only' },
    ]);
    expect(activeTargets(parsed.resources)).toEqual([{ value: 'vless://a', name: '🇫🇮 Finland' }]);
  });

  it('VPN: подписка не скачалась — ошибка словами, ресурсов нет', () => {
    const parsed = fromParse('vpn', { status: 'fetch_failed', keys: [] });
    expect(parsed.resources).toEqual([]);
    expect(parsed.error).toBe('fetchFailed');
  });

  it('IP: принятое и заметки о отброшенном, как пишет сайт', () => {
    const parsed = fromParse('ip', {
      valid: ['google.com', '8.8.8.8'],
      invalid_count: 1,
      private_count: 1,
      private: ['10.0.0.1'],
      duplicate_count: 0,
      overflow_count: 2,
      blacklisted: ['bad.example'],
    });
    expect(parsed.resources.map((r) => r.value)).toEqual(['google.com', '8.8.8.8']);
    expect(parsed.notes).toEqual([
      { key: 'invalid', count: 1 },
      { key: 'private', count: 1 },
      { key: 'overflow', count: 2 },
      { key: 'blacklisted', items: ['bad.example'] },
    ]);
  });

  it('цели из панели сразу включены', () => {
    expect(fromPanel([{ value: 'fi.example', name: 'Finland', ref: 'h1' }])).toEqual([
      { value: 'fi.example', name: 'Finland', on: true },
    ]);
  });

  it('оплатить можно только с точками, ресурсами и деньгами', () => {
    const one = [{ value: 'a', name: 'a', on: true }];
    expect(canPay({ pops: 0, resources: one, cost: 0.1, balance: 5 })).toBe(false);
    expect(canPay({ pops: 3, resources: [], cost: 0.1, balance: 5 })).toBe(false);
    expect(canPay({ pops: 3, resources: one, cost: 6, balance: 5 })).toBe(false);
    expect(canPay({ pops: 3, resources: one, cost: null, balance: 5 })).toBe(false);
    expect(canPay({ pops: 3, resources: one, cost: 0.1, balance: 5 })).toBe(true);
  });
});
