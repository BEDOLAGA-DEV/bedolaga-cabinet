// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AppWithNavigator } from './AppWithNavigator';
import { useBlockingStore } from './store/blocking';

const bridge = vi.hoisted(() => ({
  click: null as (() => void) | null,
  close: vi.fn(),
  show: vi.fn(),
}));
vi.mock('@telegram-apps/sdk-react', () => ({
  showBackButton: bridge.show,
  hideBackButton: vi.fn(),
  onBackButtonClick: (handler: () => void) => {
    bridge.click = handler;
  },
  offBackButtonClick: () => {
    bridge.click = null;
  },
  retrieveLaunchParams: () => ({}),
}));
vi.mock('./hooks/useTelegramSDK', () => ({
  isInTelegramWebApp: () => true,
  closeTelegramApp: bridge.close,
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: undefined }) }));
vi.mock('./App', () => ({ default: () => <div>Cabinet</div> }));
vi.mock('./api/subscription', () => ({ subscriptionApi: {} }));
vi.mock('./components/DocumentBranding', () => ({ DocumentBranding: () => null }));
vi.mock('./platform/PlatformProvider', () => ({
  PlatformProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('./providers/ThemeColorsProvider', () => ({
  ThemeColorsProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('./providers/WebSocketProvider', () => ({
  WebSocketProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('./components/Toast', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('./components/primitives/Tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/lib/twemoji', () => ({ default: ({ children }: { children: ReactNode }) => children }));

afterEach(() => {
  cleanup();
  useBlockingStore.getState().clearBlocking();
  vi.clearAllMocks();
});

it('uses Telegram Back to close the Mini App while the backend is unavailable', () => {
  window.history.replaceState(null, '', '/login');
  useBlockingStore.getState().setBackendUnavailable();
  render(<AppWithNavigator />);

  expect(bridge.show).toHaveBeenCalled();
  expect(bridge.click).not.toBeNull();
  act(() => bridge.click?.());
  expect(bridge.close).toHaveBeenCalledOnce();
  expect(window.location.pathname).toBe('/login');
});
