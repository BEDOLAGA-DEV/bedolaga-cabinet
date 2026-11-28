// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceCards, platformKind } from './DeviceCards';
import type { Subscription } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallback?: string | Record<string, unknown>,
      opts?: Record<string, unknown>,
    ) => {
      const tpl = typeof fallback === 'string' ? fallback : key;
      const vars = (typeof fallback === 'object' ? fallback : opts) ?? {};
      return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: true }) }));
vi.mock('@/platform', () => ({
  useHaptic: () => ({ notification: () => {}, impact: () => {} }),
}));
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useDestructiveConfirm: () => async () => true,
}));

const hwid = 'masked12-MiXeD-case<&>long-device-identifier';
let devicesResponse: unknown;
vi.mock('@/api/subscription', () => ({
  subscriptionApi: { getDevices: async () => devicesResponse },
}));
afterEach(cleanup);

function renderCards(sub: Partial<Subscription> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <DeviceCards
          subscription={
            { id: 7, subscription_url: 'https://x', device_limit: 3, ...sub } as Subscription
          }
          subscriptionId={7}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DeviceCards', () => {
  it('keeps the exact HWID as plain selectable text for support', async () => {
    devicesResponse = {
      total: 1,
      device_limit: 3,
      devices: [{ hwid, platform: 'Android', device_model: 'Pixel 8', created_at: null }],
    };
    renderCards();
    const id = await screen.findByText(hwid);
    expect(id.textContent).toBe(hwid);
    expect(id.classList.contains('select-all')).toBe(true);
    expect(id.children).toHaveLength(0);
  });

  it('shows used/limit and a connect card with free slots', async () => {
    devicesResponse = {
      total: 1,
      device_limit: 3,
      devices: [{ hwid, platform: 'iOS', device_model: 'iPhone 15', created_at: null }],
    };
    renderCards();
    expect(await screen.findByText('1 из 3')).toBeTruthy();
    expect(screen.getByText('Свободно мест: 2')).toBeTruthy();
  });

  it('hides the connect card and explains when the limit is reached', async () => {
    devicesResponse = {
      total: 1,
      device_limit: 1,
      devices: [{ hwid, platform: 'Windows', device_model: 'PC', created_at: null }],
    };
    renderCards({ device_limit: 1 });
    expect(await screen.findByText(/Все места заняты/)).toBeTruthy();
    expect(screen.queryByText('Подключить устройство')).toBeNull();
  });

  it('offers to connect the first device when the list is empty', async () => {
    devicesResponse = { total: 0, device_limit: 3, devices: [] };
    renderCards();
    expect(await screen.findByText('Подключить первое устройство')).toBeTruthy();
  });
});

describe('platformKind', () => {
  it.each([
    ['iOS', 'iPhone15,2', 'apple'],
    ['macOS', 'MacBookPro', 'apple'],
    ['Android', 'Pixel 8', 'android'],
    ['AndroidTV', 'Chromecast', 'tv'],
    ['Windows', 'DESKTOP-1', 'windows'],
    ['Linux', 'x86_64', 'linux'],
    ['', 'Unknown', 'other'],
  ])('%s / %s → %s', (platform, device_model, kind) => {
    expect(platformKind({ platform, device_model })).toBe(kind);
  });
});
