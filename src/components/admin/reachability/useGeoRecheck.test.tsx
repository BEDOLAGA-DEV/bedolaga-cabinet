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
const RUNNING = { status: 'running', run_id: null, reserve_kopeks: 90 };
/** Тот же отчёт с записями идущих повторов: новой задачи бот не заводит. */
const parent = (rechecks: Record<string, unknown> = {}) =>
  ({ id: 44, kind: 'geo', status: 'done', result: { rows: [], rechecks } }) as unknown as Job;

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

  it('запуск помечает город занятым; опрос родителя ждёт, пока запись «идёт» не исчезнет, и перечитывает отчёт', async () => {
    vi.mocked(reachabilityApi.recheckGeo).mockResolvedValue(parent({ 'r|c|': RUNNING }));
    vi.mocked(reachabilityApi.getJob)
      .mockResolvedValueOnce(parent({ 'r|c|': { ...RUNNING, run_id: 812 } }))
      .mockResolvedValueOnce(parent({}));
    const { result } = renderHook(() => useGeoRecheck(parent()), { wrapper });
    await act(async () => {
      result.current.start(row, true);
      result.current.start(row, false);
    });
    expect(reachabilityApi.recheckGeo).toHaveBeenCalledTimes(1);
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
    expect(reachabilityApi.getJob).toHaveBeenCalledWith(44);
    expect(result.current.busy.has('r|c|')).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(result.current.busy.has('r|c|')).toBe(false);
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin-reachability-job', 44],
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin-reachability-jobs'],
    });
    expect(notify.error).not.toHaveBeenCalled();
  });
  it('отказ бота — словами; повтор, упавший у сервиса, — причина из записи в отчёте', async () => {
    vi.mocked(reachabilityApi.recheckGeo).mockRejectedValue(
      Object.assign(new Error('400'), {
        isAxiosError: true,
        response: { data: { detail: 'Такого города в отчёте нет' } },
      }),
    );
    const { result } = renderHook(() => useGeoRecheck(parent()), { wrapper });
    await act(async () => {
      result.current.start(row, false);
    });
    expect(notify.error).toHaveBeenCalledWith('Такого города в отчёте нет');
    expect(result.current.busy.size).toBe(0);
    vi.mocked(reachabilityApi.recheckGeo).mockResolvedValue(parent({ 'r|c|': RUNNING }));
    vi.mocked(reachabilityApi.getJob).mockResolvedValue(
      parent({ 'r|c|': { status: 'failed', error: 'Прогон пропал на стороне сервиса' } }),
    );
    await act(async () => {
      result.current.start(row, false);
    });
    expect(result.current.busy.has('r|c|')).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(notify.error).toHaveBeenLastCalledWith('Прогон пропал на стороне сервиса');
    expect(result.current.busy.has('r|c|')).toBe(false);
  });
  it('запись «идёт» в самом отчёте (страницу перезагрузили) сразу занята и дожидается итога опросом', async () => {
    vi.mocked(reachabilityApi.getJob).mockResolvedValue(parent({}));
    const { result } = renderHook(() => useGeoRecheck(parent({ 'r|c|': RUNNING })), { wrapper });
    expect(result.current.busy.has('r|c|')).toBe(true);
    expect(reachabilityApi.recheckGeo).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(result.current.busy.has('r|c|')).toBe(false);
    expect(notify.error).not.toHaveBeenCalled();
  });
  it('старая запись «не удался» в отчёте не считается занятой и не поднимает уведомление', () => {
    const failed = parent({ 'r|c|': { status: 'failed', error: 'старое' } });
    const { result } = renderHook(() => useGeoRecheck(failed), { wrapper });
    expect(result.current.busy.size).toBe(0);
    expect(notify.error).not.toHaveBeenCalled();
  });
});
