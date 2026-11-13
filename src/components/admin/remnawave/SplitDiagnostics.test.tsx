// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { getSplitDiagnostics, type SplitDiagnosticsResponse } from '@/api/adminSplitDiagnostics';
import { SplitDiagnostics } from './SplitDiagnostics';

vi.mock('@/api/adminSplitDiagnostics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/adminSplitDiagnostics')>()),
  getSplitDiagnostics: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const snapshot: SplitDiagnosticsResponse = {
  checked_at: '2026-11-13T12:00:00Z',
  freshness_seconds: 90,
  local_runtime_running: null,
  force_disconnect_enabled: false,
  active_bindings: 0,
  bindings_truncated: false,
  unbound_enrollments: 0,
  scopes: [],
};
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SplitDiagnostics />
    </QueryClientProvider>,
  );
}
it('shows empty durable state and unknown local runtime without claiming service failure', async () => {
  vi.mocked(getSplitDiagnostics).mockResolvedValue(snapshot);
  mount();
  await screen.findByText('admin.splitDiagnostics.empty');
  expect(screen.getByText('admin.splitDiagnostics.runtime.unknown')).toBeTruthy();
  expect(screen.queryByText('admin.splitDiagnostics.runtime.stopped')).toBeNull();
});
it('shows a failed refresh instead of retaining a healthy snapshot, and retries manually', async () => {
  vi.mocked(getSplitDiagnostics)
    .mockResolvedValueOnce(snapshot)
    .mockRejectedValueOnce(new Error('masked-private-error'))
    .mockResolvedValue(snapshot);
  mount();
  await screen.findByText('admin.splitDiagnostics.empty');
  fireEvent.click(screen.getByRole('button', { name: 'admin.splitDiagnostics.refresh' }));
  await screen.findByText('admin.splitDiagnostics.error');
  expect(screen.queryByText('admin.splitDiagnostics.empty')).toBeNull();
  expect(screen.queryByText('masked-private-error')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'admin.splitDiagnostics.refresh' }));
  await screen.findByText('admin.splitDiagnostics.empty');
  await waitFor(() => expect(getSplitDiagnostics).toHaveBeenCalledTimes(3));
});
it('renders durable warnings with exact counts and the socket-proof limitation', async () => {
  vi.mocked(getSplitDiagnostics).mockResolvedValue({
    ...snapshot,
    active_bindings: 17,
    bindings_truncated: true,
    unbound_enrollments: 2,
    scopes: [
      {
        number: 1,
        collection_phase: 'attention',
        last_success_at: null,
        pause_until: null,
        diagnostic_ready: false,
        local_runtime_ready: true,
        queues: { collection_attention: 3 },
        oldest_pending_at: '2026-11-13T10:00:00Z',
        warnings: ['no_fresh_round', 'collection_attention'],
      },
    ],
  });
  mount();
  await screen.findByText('admin.splitDiagnostics.warning.collection_attention');
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('admin.splitDiagnostics.attention')).toBeTruthy();
  expect(screen.getByText('admin.splitDiagnostics.truncated')).toBeTruthy();
  expect(screen.getByText(/admin.splitDiagnostics.socketCaution/)).toBeTruthy();
  expect(screen.queryByText('admin.splitDiagnostics.ready')).toBeNull();
});
