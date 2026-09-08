// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Batch } from '@/api/reachability';

vi.mock('@/api/reachability', () => ({
  reachabilityApi: { getBatch: vi.fn(), cancelBatch: vi.fn() },
}));

import { reachabilityApi } from '@/api/reachability';
import { REACHABILITY_SUMMARY_KEY } from '../useTargets';
import { useBatch } from './useBatch';

/** Опрос пачки: пока идёт — раз в pollMs; по завершении опрос гаснет и сводка флота обновляется. */

const batch = (status: Batch['status']): Batch => ({
  id: 1,
  status,
  phase: null,
  scope: { kind: 'problems', host_refs: ['h1'] },
  total_targets: 1,
  done_targets: status === 'done' ? 1 : 0,
  estimated_kopeks: 640,
  cost_kopeks: status === 'done' ? 640 : null,
  error_message: null,
  created_at: null,
  started_at: null,
  finished_at: null,
  jobs: [],
});

function withClient(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useBatch', () => {
  it('polls while the batch runs, then stops and refreshes the fleet', async () => {
    vi.mocked(reachabilityApi.getBatch)
      .mockResolvedValueOnce(batch('running'))
      .mockResolvedValue(batch('done'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useBatch(1, { pollMs: 300 }), {
      wrapper: withClient(client),
    });
    await waitFor(() => expect(result.current.batch?.status).toBe('running'));
    expect(result.current.isActive).toBe(true);

    await waitFor(() => expect(result.current.batch?.status).toBe('done'));
    expect(result.current.isActive).toBe(false);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [REACHABILITY_SUMMARY_KEY] });
  });

  it('does nothing without an id', () => {
    vi.mocked(reachabilityApi.getBatch).mockClear();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useBatch(null), { wrapper: withClient(client) });
    expect(result.current.batch).toBeUndefined();
    expect(result.current.isActive).toBe(false);
    expect(reachabilityApi.getBatch).not.toHaveBeenCalled();
  });
});
