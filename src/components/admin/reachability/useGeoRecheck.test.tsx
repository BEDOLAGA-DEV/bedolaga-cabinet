// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

const notify = { error: vi.fn(), success: vi.fn() };
vi.mock('@/platform/hooks/useNotify', () => ({ useNotify: () => notify }));
vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: { recheckGeo: vi.fn(), getJob: vi.fn() },
}));

import { reachabilityApi } from '@/api/reachability';
import type { GeoRow } from './geoRowsView';
import { useGeoRecheck } from './useGeoRecheck';

const row = { region: 'r', city: 'c', req_isp: null } as unknown as GeoRow;
const parent = { id: 44 } as Job;

describe('useGeoRecheck', () => {
  let client: QueryClient;
  beforeEach(() => {
    vi.useFakeTimers();
    client = new QueryClient();
    vi.spyOn(client, 'invalidateQueries');
    vi.mocked(reachabilityApi.recheckGeo).mockReset();
    vi.mocked(reachabilityApi.getJob).mockReset();
    notify.error.mockReset();
  });
  afterEach(() => vi.useRealTimers());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  it('запуск сразу помечает город занятым, опрос ждёт дочернюю задачу и перечитывает родителя', async () => {
    vi.mocked(reachabilityApi.recheckGeo).mockResolvedValue({ id: 78, status: 'pending' } as Job);
    vi.mocked(reachabilityApi.getJob)
      .mockResolvedValueOnce({ id: 78, status: 'running' } as Job)
      .mockResolvedValueOnce({ id: 78, status: 'done' } as Job);
    const { result } = renderHook(() => useGeoRecheck(parent), { wrapper });
    await act(async () => {
      result.current.start(row, true);
    });
    expect(reachabilityApi.recheckGeo).toHaveBeenCalledWith(44, {
      region: 'r',
      city: 'c',
      req_isp: null,
      same_exit: true,
    });
    expect(result.current.busy.has('r|c|')).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(result.current.busy.has('r|c|')).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(result.current.busy.has('r|c|')).toBe(false);
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin-reachability-job', 44],
    });
    expect(notify.error).not.toHaveBeenCalled();
  });
  it('отказ бота — словами; упавшая дочерняя задача — её сообщение', async () => {
    vi.mocked(reachabilityApi.recheckGeo).mockRejectedValue(
      Object.assign(new Error('400'), {
        isAxiosError: true,
        response: { data: { detail: 'Такого города в отчёте нет' } },
      }),
    );
    const { result } = renderHook(() => useGeoRecheck(parent), { wrapper });
    await act(async () => {
      result.current.start(row, false);
    });
    expect(notify.error).toHaveBeenCalledWith('Такого города в отчёте нет');
    expect(result.current.busy.size).toBe(0);
    vi.mocked(reachabilityApi.recheckGeo).mockResolvedValue({ id: 79 } as Job);
    vi.mocked(reachabilityApi.getJob).mockResolvedValue({
      id: 79,
      status: 'failed',
      error_message: 'Прогон пропал на стороне сервиса',
    } as Job);
    await act(async () => {
      result.current.start(row, false);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(notify.error).toHaveBeenLastCalledWith('Прогон пропал на стороне сервиса');
  });
});
