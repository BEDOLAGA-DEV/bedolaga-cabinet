import { describe, expect, it } from 'vitest';
import type { PreviewResponse } from '@/api/reachability';
import { formatList, launchSummary } from './launchSummary';

const preview = (overrides: Partial<PreviewResponse> = {}): PreviewResponse => ({
  kind: 'probe',
  targets: [
    {
      kind: 'host',
      label: 'RU-BS',
      address: 'bs.example',
      port: 443,
      target_key: 'bs.example:443',
      sni: null,
      ref: {},
      purpose: 'bs',
    },
    {
      kind: 'custom',
      label: '',
      address: '203.0.113.5',
      port: null,
      target_key: '203.0.113.5',
      sni: null,
      ref: {},
      purpose: 'unknown',
    },
  ],
  units_resolved: ['mts|цфо|on', 'tele2|цфо|on'],
  skipped: { dpi_off: [], unavailable: [], unknown: [], blocked_targets: [] },
  cost_kopeks: 640,
  estimate_is_exact: true,
  warnings: [],
  balance_kopeks: 10_000,
  ...overrides,
});

describe('launchSummary', () => {
  it('собирает цели (ярлык или ключ), симки, цену и остаток после списания', () => {
    expect(launchSummary(preview())).toEqual({
      targets: ['RU-BS', '203.0.113.5'],
      units: ['mts|цфо|on', 'tele2|цфо|on'],
      cost: 640,
      exact: true,
      balanceAfter: 9_360,
    });
  });
  it('без цены или баланса остаток неизвестен', () => {
    expect(launchSummary(preview({ cost_kopeks: null })).balanceAfter).toBeNull();
    expect(launchSummary(preview({ balance_kopeks: null })).balanceAfter).toBeNull();
    expect(launchSummary(preview({ estimate_is_exact: false })).exact).toBe(false);
  });
});

describe('formatList', () => {
  it('короткий список через запятую, длинный — обрезан с хвостом', () => {
    const more = (n: number) => `+${n}`;
    expect(formatList(['a', 'b'], 3, more)).toBe('a, b');
    expect(formatList(['a', 'b', 'c', 'd', 'e'], 3, more)).toBe('a, b, c +2');
    expect(formatList([], 3, more)).toBe('');
  });
});
