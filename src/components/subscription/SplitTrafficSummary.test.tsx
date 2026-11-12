// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import SplitTrafficSummary from './SplitTrafficSummary';
import ru from '@/locales/ru.json';

const fetchSummary = vi.hoisted(() => vi.fn());
vi.mock('@/api/subscription', () => ({
  subscriptionApi: { getSplitTrafficSummary: fetchSummary },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key
        .split('.')
        .reduce<unknown>(
          (v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined),
          ru,
        ) ?? key,
  }),
}));
vi.mock('@/utils/formatTraffic', () => ({ formatTraffic: (gb: number) => `${gb} GB` }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const group = {
  mode: 'finite',
  remaining_bytes: '0',
  pending_bytes: '0',
  pending_operations: 0,
  needs_review: false,
};
function show(id = 42, mode: 'split' | 'split_pending' = 'split') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <SplitTrafficSummary subscriptionId={id} mode={mode} />
    </QueryClientProvider>,
  );
}
it('shows zero separately from unlimited for the selected subscription', async () => {
  fetchSummary.mockResolvedValue({
    subscription_id: 42,
    groups: { ordinary: { ...group, mode: 'unlimited', remaining_bytes: null }, bs: group },
  });
  show();
  expect(await screen.findByText('0 GB')).toBeTruthy();
  expect(screen.getByText('Безлимит')).toBeTruthy();
  expect(fetchSummary).toHaveBeenCalledWith(42);
});
it('does not fetch or invent balance during transition', () => {
  show(42, 'split_pending');
  expect(fetchSummary).not.toHaveBeenCalled();
  expect(screen.getByText('Разделение трафика настраивается')).toBeTruthy();
});
it('uses the shared loading state', () => {
  fetchSummary.mockReturnValue(new Promise(() => {}));
  show();
  expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
});
it('keeps pending usage separate and does not imply disabled access', async () => {
  fetchSummary.mockResolvedValue({
    subscription_id: 42,
    groups: { ordinary: group, bs: { ...group, pending_bytes: '123', pending_operations: 1 } },
  });
  show();
  expect(
    await screen.findByText('Часть расхода уточняется. Она ещё не списана с остатка.'),
  ).toBeTruthy();
});
it('does not show a response belonging to another subscription', async () => {
  fetchSummary.mockResolvedValue({ subscription_id: 43, groups: { ordinary: group, bs: group } });
  show();
  await waitFor(() =>
    expect(screen.getByText('Не удалось загрузить остатки. Попробуйте обновить.')).toBeTruthy(),
  );
  expect(screen.queryByText('0 GB')).toBeNull();
});
it('offers retry when the API fails', async () => {
  fetchSummary.mockRejectedValue(new Error('private provider details'));
  show();
  expect(
    await screen.findByText('Не удалось загрузить остатки. Попробуйте обновить.'),
  ).toBeTruthy();
  expect(screen.queryByText('private provider details')).toBeNull();
  fetchSummary.mockResolvedValue({ subscription_id: 42, groups: { ordinary: group, bs: group } });
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findAllByText('0 GB')).toHaveLength(2);
  expect(fetchSummary).toHaveBeenCalledTimes(2);
});
it('does not expose purchase controls without explicit server readiness', async () => {
  fetchSummary.mockResolvedValue({
    subscription_id: 42,
    purchase_available: false,
    purchase_packages: [{ group: 'bs', gb: 10 }],
    groups: { ordinary: group, bs: group },
  });
  show();
  await screen.findAllByText('0 GB');
  expect(screen.queryByRole('combobox')).toBeNull();
});
