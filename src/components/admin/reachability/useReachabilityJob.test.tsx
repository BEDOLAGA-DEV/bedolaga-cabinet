// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

vi.mock('@/api/reachability', () => ({ reachabilityApi: { getJob: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { useReachabilityJob } from './useReachabilityJob';

const job = (overrides: Partial<Job>): Job => ({
  id: 1,
  kind: 'probe',
  status: 'running',
  phase: 'waiting',
  trigger: 'manual',
  started_by_user_id: 1,
  external_id: null,
  targets: [],
  units_requested: [],
  units_resolved: [],
  units_effective: null,
  skipped: null,
  dpi: 'on',
  estimated_kopeks: 18,
  estimate_is_exact: true,
  cost_kopeks: null,
  refunded_kopeks: null,
  result: null,
  error_code: null,
  error_message: null,
  retryable: null,
  attempts: 1,
  created_at: null,
  started_at: new Date().toISOString(),
  finished_at: null,
  legs: [],
  ...overrides,
});

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useReachabilityJob', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('опрашивает задачу, пока она идёт, и останавливается на done', async () => {
    const getJob = vi.mocked(reachabilityApi.getJob);
    getJob
      .mockResolvedValueOnce(job({ status: 'running' }))
      .mockResolvedValueOnce(job({ status: 'done', phase: null, cost_kopeks: 18 }));

    const { result } = renderHook(() => useReachabilityJob(1, { pollMs: 50 }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.phase).toBe('running'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(80);
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(getJob).toHaveBeenCalledTimes(2);
    expect(result.current.job?.cost_kopeks).toBe(18);
  });

  it('failed и cancelled — конечные стадии с текстом ошибки', async () => {
    vi.mocked(reachabilityApi.getJob).mockResolvedValue(
      job({ status: 'failed', error_code: 'no_dpi_on', error_message: 'нет симок' }),
    );
    const { result } = renderHook(() => useReachabilityJob(2, { pollMs: 50 }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.phase).toBe('failed'));
    expect(result.current.error).toBe('нет симок');
  });

  it('после maxMs опрос прекращается со стадией stalled', async () => {
    vi.mocked(reachabilityApi.getJob).mockResolvedValue(
      job({ status: 'running', phase: 'retrieving' }),
    );
    const { result } = renderHook(() => useReachabilityJob(3, { pollMs: 50, maxMs: 120 }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.phase).toBe('running'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await waitFor(() => expect(result.current.phase).toBe('stalled'));
    const calls = vi.mocked(reachabilityApi.getJob).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(vi.mocked(reachabilityApi.getJob).mock.calls.length).toBe(calls);
  });

  it('ошибка запроса — стадия failed с текстом', async () => {
    vi.mocked(reachabilityApi.getJob).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useReachabilityJob(4, { pollMs: 50 }), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.phase).toBe('failed'));
    expect(result.current.error).toContain('network down');
  });

  it('без jobId ничего не запрашивает', () => {
    const { result } = renderHook(() => useReachabilityJob(null), { wrapper: wrapper() });
    expect(result.current.phase).toBe('idle');
    expect(reachabilityApi.getJob).not.toHaveBeenCalled();
  });
});
