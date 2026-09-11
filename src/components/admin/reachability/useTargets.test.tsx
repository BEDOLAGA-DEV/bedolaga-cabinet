// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

/** Без источника (подписка по умолчанию не задана) запрос конфигов не уходит — объясняет форма. */

vi.mock('@/api/reachability', () => ({
  reachabilityApi: { getSubscriptionConfigs: vi.fn(), parseInput: vi.fn() },
}));

import { reachabilityApi } from '@/api/reachability';
import { useParsedInput, useSubscriptionConfigs } from './useTargets';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSubscriptionConfigs', () => {
  it('выключенный запрос не дёргает API и не висит в загрузке', () => {
    const { result } = renderHook(() => useSubscriptionConfigs(null, null, false), { wrapper });
    expect(reachabilityApi.getSubscriptionConfigs).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('с пользователем запрос уходит с его id', async () => {
    vi.mocked(reachabilityApi.getSubscriptionConfigs).mockResolvedValue({
      short_uuid: 'u-1',
      configs: [],
      rejected: [],
    });
    const { result } = renderHook(() => useSubscriptionConfigs(15, null), { wrapper });
    await waitFor(() => expect(result.current.data?.short_uuid).toBe('u-1'));
    expect(reachabilityApi.getSubscriptionConfigs).toHaveBeenCalledWith({
      userId: 15,
      shortUuid: undefined,
    });
  });
});

describe('useParsedInput', () => {
  it('пустое поле не дёргает бота, текст уходит обрезанным', async () => {
    const { result: empty } = renderHook(() => useParsedInput('  '), { wrapper });
    expect(reachabilityApi.parseInput).not.toHaveBeenCalled();
    expect(empty.current.isLoading).toBe(false);
    vi.mocked(reachabilityApi.parseInput).mockResolvedValue({
      configs: [],
      rejected: [],
      sources: [],
    });
    const { result } = renderHook(() => useParsedInput(' https://sub.example/x \n'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(reachabilityApi.parseInput).toHaveBeenCalledWith('https://sub.example/x');
  });
});
