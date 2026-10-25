// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '../../platform/PlatformProvider';
import ServiceUnavailableScreen from './ServiceUnavailableScreen';
import { useBlockingStore } from '../../store/blocking';

const bootstrap = vi.hoisted(() => ({
  isAuthenticated: true,
  initialize: vi.fn<() => Promise<void>>(),
}));
vi.mock('../../store/auth', () => ({ useAuthStore: { getState: () => bootstrap } }));
vi.mock('../../api/health', () => ({
  pingBackend: async () => true,
  hasEverReachedBackend: () => true,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => {
  cleanup();
  useBlockingStore.getState().clearBlocking();
});

it('finishes an interrupted auth bootstrap before lifting an outage overlay', async () => {
  let finish!: () => void;
  bootstrap.initialize.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  useBlockingStore.getState().setBackendUnavailable();
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <ServiceUnavailableScreen />
      </PlatformProvider>
    </QueryClientProvider>,
  );

  await waitFor(() => expect(bootstrap.initialize).toHaveBeenCalledOnce());
  expect(useBlockingStore.getState().blockingType).toBe('backend_unavailable');
  await act(async () => finish());
  await waitFor(() => expect(useBlockingStore.getState().blockingType).toBeNull());
  client.clear();
});
