import { describe, expect, it } from 'vitest';
import { MAX_CUSTOM_TARGETS, parseTargets } from './targetsInput';

/** Поле «Свои адреса»: до 10 целей через запятую или с новой строки, без дублей и пустых. */

describe('parseTargets', () => {
  it('режет по запятым и переносам, убирает пустые и дубли', () => {
    expect(parseTargets('ya.ru, 77.88.8.8\n\n github.com:443 , ya.ru')).toEqual({
      targets: ['ya.ru', '77.88.8.8', 'github.com:443'],
      overLimit: 0,
    });
  });

  it('оставляет первые десять, остальное считает переполнением', () => {
    const text = Array.from({ length: 13 }, (_, i) => `10.0.0.${i}`).join(',');
    const parsed = parseTargets(text);
    expect(parsed.targets).toHaveLength(MAX_CUSTOM_TARGETS);
    expect(parsed.overLimit).toBe(3);
  });

  it('пустая строка — пусто', () => {
    expect(parseTargets('')).toEqual({ targets: [], overLimit: 0 });
  });
});

describe('scanSubnet', () => {
  it('IP превращается в свою подсеть /24, CIDR /24 остаётся как есть', async () => {
    const { scanSubnet } = await import('./targetsInput');
    expect(scanSubnet('192.0.2.10')).toBe('192.0.2.0/24');
    expect(scanSubnet(' 192.0.2.0/24 ')).toBe('192.0.2.0/24');
    expect(scanSubnet('192.0.2.77/24')).toBe('192.0.2.0/24');
  });

  it('домены, другие маски и мусор не годятся', async () => {
    const { scanSubnet } = await import('./targetsInput');
    expect(scanSubnet('example.com')).toBeNull();
    expect(scanSubnet('10.0.0.0/16')).toBeNull();
    expect(scanSubnet('')).toBeNull();
    expect(scanSubnet('999.1.1.1')).toBeNull();
  });
});
