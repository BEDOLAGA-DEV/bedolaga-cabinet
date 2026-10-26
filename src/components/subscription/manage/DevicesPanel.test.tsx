// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { DevicesPanel } from './DevicesPanel';
import type { Subscription } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('@/platform', () => ({ useHaptic: () => ({ notification: () => {} }) }));
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useDestructiveConfirm: () => async () => true,
}));
const hwid = 'masked12-MiXeD-case<&>long-device-identifier';
vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    getDevices: async () => ({
      total: 1,
      device_limit: 2,
      devices: [{ hwid, platform: 'Android', device_model: 'Masked phone' }],
    }),
  },
}));
afterEach(cleanup);
it('exposes the entire exact HWID as selectable text without hover and without parsing HTML', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DevicesPanel subscription={{ id: 7 } as Subscription} subscriptionId={7} />
    </QueryClientProvider>,
  );
  const identifier = await screen.findByText(hwid);
  expect(identifier.textContent).toBe(hwid);
  expect(identifier.classList.contains('select-all')).toBe(true);
  expect(identifier.classList.contains('break-all')).toBe(true);
  expect(identifier.children).toHaveLength(0);
});
