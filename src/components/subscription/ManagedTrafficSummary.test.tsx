// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ManagedTrafficSummary from './ManagedTrafficSummary';
import ru from '@/locales/ru.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key
        .split('.')
        .reduce<unknown>(
          (value, part) =>
            value && typeof value === 'object'
              ? (value as Record<string, unknown>)[part]
              : undefined,
          ru,
        ) ?? key,
  }),
}));
vi.mock('@/utils/formatTraffic', () => ({ formatTraffic: (gb: number) => `${gb} GB` }));
vi.mock('@/utils/uiLocale', () => ({ uiLocale: () => 'en-US' }));
afterEach(cleanup);

describe('managed traffic balances', () => {
  it('does not invent balances for legacy subscriptions', () => {
    const { container } = render(
      <ManagedTrafficSummary subscription={{ traffic_accounting_mode: 'legacy' }} />,
    );
    expect(container.textContent).toBe('');
  });
  it('shows exhausted traffic as zero, not unlimited or unknown', () => {
    render(
      <ManagedTrafficSummary
        subscription={{
          traffic_accounting_mode: 'managed',
          traffic_remaining_gb: 0,
          base_traffic_remaining_gb: 0,
        }}
      />,
    );
    expect(screen.getAllByText('0 GB')).toHaveLength(2);
  });
  it('shows total and base separately without adding base twice', () => {
    render(
      <ManagedTrafficSummary
        subscription={{
          traffic_accounting_mode: 'managed',
          traffic_remaining_gb: 80,
          base_traffic_remaining_gb: 40,
        }}
      />,
    );
    expect(screen.getByText('80 GB')).toBeTruthy();
    expect(screen.getByText('Всего осталось')).toBeTruthy();
    expect(screen.getByText('Из них по тарифу')).toBeTruthy();
    expect(screen.getByText('40 GB')).toBeTruthy();
    expect(screen.queryByText('120 GB')).toBeNull();
  });
  it('uses the latest refresh and omits missing or invalid dates', () => {
    render(
      <ManagedTrafficSummary
        subscription={{
          traffic_accounting_mode: 'managed',
          traffic_remaining_gb: 80,
          next_traffic_refresh_at: 'bad-date',
        }}
        refreshed={{ traffic_remaining_gb: 12.5 }}
      />,
    );
    expect(screen.getByText('12.5 GB')).toBeTruthy();
    expect(screen.queryByText('Обновление трафика тарифа')).toBeNull();
  });
  it('clears a stale calendar when a refresh explicitly returns null', () => {
    render(
      <ManagedTrafficSummary
        subscription={{
          traffic_accounting_mode: 'managed',
          traffic_remaining_gb: 80,
          next_traffic_refresh_at: '2027-01-01T00:00:00Z',
        }}
        refreshed={{ next_traffic_refresh_at: null }}
      />,
    );
    expect(screen.queryByText('Обновление трафика тарифа')).toBeNull();
  });
  it('hides managed values when the latest refresh is legacy', () => {
    const { container } = render(
      <ManagedTrafficSummary
        subscription={{ traffic_accounting_mode: 'managed', traffic_remaining_gb: 80 }}
        refreshed={{ traffic_accounting_mode: 'legacy', traffic_remaining_gb: null }}
      />,
    );
    expect(container.textContent).toBe('');
  });
  it('does not replace unknown balance with a nominal package limit', () => {
    const { container } = render(
      <ManagedTrafficSummary
        subscription={{ traffic_accounting_mode: 'managed', traffic_remaining_gb: null }}
      />,
    );
    expect(container.textContent).toContain('—');
  });
});
