// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useUserDetailData } from './useUserDetailData';

const requests = vi.hoisted(() => ({ devices: vi.fn(), panel: vi.fn(), nodes: vi.fn() }));
const detail = (id: number) => ({
  id,
  subscriptions: [
    { id: id * 10, is_active: true },
    { id: id * 10 + 1, is_active: true },
  ],
});
vi.mock('@/store/permissions', () => ({
  usePermissionStore: (selector: (value: { hasPermission: () => boolean }) => unknown) =>
    selector({ hasPermission: () => false }),
}));
vi.mock('@/api/adminUsers', () => ({
  adminUsersApi: {
    getUser: async (id: number) => detail(id),
    getUserDevices: (...args: unknown[]) => requests.devices(...args),
    getPanelInfo: (...args: unknown[]) => requests.panel(...args),
    getNodeUsage: (...args: unknown[]) => requests.nodes(...args),
    getAvailableTariffs: async () => ({ tariffs: [] }),
  },
}));
afterEach(cleanup);

it.each([false, true])(
  'keeps devices, panel and node stats bound to the selected user with warm target cache=%s',
  async (warm) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    requests.devices.mockImplementation(async (id: number, sub: number) => ({
      devices: [{ hwid: `user-${id}-sub-${sub}` }],
    }));
    requests.panel.mockImplementation(async (id: number) => ({ username: `panel-${id}` }));
    requests.nodes.mockImplementation(async (id: number) => ({ owner: id }));
    if (warm) {
      client.setQueryData(['admin-user-detail', 2], detail(2));
      client.setQueryData(['admin-user-devices', 2, 20], { devices: [{ hwid: 'user-2-sub-20' }] });
      client.setQueryData(['admin-user-panel-info', 2, 20], { username: 'panel-2' });
      client.setQueryData(['admin-user-node-usage', 2, 20], { owner: 2 });
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const hook = renderHook(({ id }) => useUserDetailData(id, 'subscription'), {
      wrapper,
      initialProps: { id: 1 },
    });
    await waitFor(() =>
      expect(hook.result.current.devicesQuery.data?.devices[0]?.hwid).toBe('user-1-sub-10'),
    );
    act(() => hook.result.current.selectSubscription(11));
    await waitFor(() =>
      expect(hook.result.current.devicesQuery.data?.devices[0]?.hwid).toBe('user-1-sub-11'),
    );
    hook.rerender({ id: 2 });
    expect(hook.result.current.devicesQuery.data?.devices[0]?.hwid ?? '').not.toContain('user-1');
    await waitFor(() =>
      expect(hook.result.current.devicesQuery.data?.devices[0]?.hwid).toBe('user-2-sub-20'),
    );
    expect(hook.result.current.activeSubscriptionId).toBe(20);
    expect(hook.result.current.panelInfo).toEqual({ username: 'panel-2' });
    expect(hook.result.current.nodeUsage).toEqual({ owner: 2 });
    hook.unmount();
    client.clear();
  },
);
