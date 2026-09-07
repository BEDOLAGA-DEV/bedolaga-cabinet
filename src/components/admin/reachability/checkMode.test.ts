import { describe, expect, it } from 'vitest';
import { detectCheckMode } from './checkMode';

/**
 * Одно поле на странице флота: что бы человек ни вставил, вкладка выбирается сама.
 * Ссылка конфига или подписки — «Подписка», подсеть /24 — «CIDR», остальное — «IP / домен».
 */
describe('detectCheckMode', () => {
  it('адреса, домены и сайты — «IP / домен»', () => {
    expect(detectCheckMode('ya.ru')).toBe('ip');
    expect(detectCheckMode('77.88.8.8, github.com:443')).toBe('ip');
    expect(detectCheckMode('https://ya.ru')).toBe('ip');
    expect(detectCheckMode('https://ya.ru/')).toBe('ip');
    expect(detectCheckMode('')).toBe('ip');
  });

  it('ссылки конфигов и подписок — «Подписка»', () => {
    expect(detectCheckMode('vless://uuid@ru1.example:443?security=reality#ru1')).toBe('vless');
    expect(detectCheckMode('ya.ru\nvmess://abc')).toBe('vless');
    expect(detectCheckMode('https://sub.dolbi.space/L1zncAJoQD2pWkDb')).toBe('vless');
    expect(detectCheckMode('dmxlc3M6Ly91dWlkQGV4YW1wbGU6NDQzP3NlY3VyaXR5PXJlYWxpdHkjcnUx')).toBe(
      'vless',
    );
  });

  it('подсеть /24 — «CIDR»', () => {
    expect(detectCheckMode('192.0.2.0/24')).toBe('cidr');
    expect(detectCheckMode(' 203.0.113.7/24 ')).toBe('cidr');
    expect(detectCheckMode('192.0.2.0/24, ya.ru')).toBe('ip');
  });
});
