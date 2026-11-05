// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { ReissueLinkButton } from './ReissueLinkButton';
import type { Subscription } from '@/types';

const state = vi.hoisted(() => ({
  reissued: false,
  reset: false as boolean | undefined,
  release: undefined as (() => void) | undefined,
  defer: false,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/platform', () => ({ useHaptic: () => ({ notification: () => {} }) }));
vi.mock('@/platform/hooks/useNativeDialog', () => ({
  useDestructiveConfirm: () => async () => true,
}));
vi.mock('@/api/subscription', () => ({
  subscriptionApi: {
    revokeSubscription: async () => {
      if (state.defer)
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      state.reissued = true;
      return { success: true, devices_reset: state.reset, cooldown_seconds: 900 };
    },
  },
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  state.defer = false;
  state.release = undefined;
});

function CachedConnection() {
  const link = useQuery({
    queryKey: ['connectionLink', 10],
    queryFn: async () => (state.reissued ? 'new-link' : 'old-link'),
  });
  const config = useQuery({
    queryKey: ['appConfig', 10],
    queryFn: async () => (state.reissued ? 'new-app' : 'old-app'),
  });
  const devices = useQuery({
    queryKey: ['devices', 10],
    queryFn: async () => (state.reissued && state.reset ? 'no-devices' : 'device-a'),
  });
  return (
    <div>
      {link.data} {config.data} {devices.data}
    </div>
  );
}

it.each([false, true, undefined])(
  'refreshes links and reports the actual reset result (%s)',
  async (reset) => {
    state.reissued = false;
    state.reset = reset;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const tree = (subscriptionId: number) => (
      <QueryClientProvider client={client}>
        <CachedConnection />
        <ReissueLinkButton
          subscription={{ is_active: true, is_limited: false, is_trial: false } as Subscription}
          subscriptionId={subscriptionId}
        />
      </QueryClientProvider>
    );
    const { rerender } = render(tree(10));
    await screen.findByText(/old-link old-app device-a/);
    fireEvent.click(screen.getByRole('button'));
    await screen.findByText(/new-link new-app/);
    if (reset === false) {
      expect(await screen.findByRole('status')).toHaveProperty(
        'textContent',
        'subscription.revoke.partialWarning',
      );
      expect(screen.getByText(/device-a/)).toBeTruthy();
      rerender(tree(11));
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getByRole('button')).toHaveProperty('disabled', false);
      rerender(tree(10));
      expect(screen.getByRole('status')).toBeTruthy();
    } else {
      expect(screen.queryByRole('status')).toBeNull();
    }
    client.clear();
  },
);

it('keeps an in-flight reissue result on its original subscription', async () => {
  state.reissued = false;
  state.reset = false;
  state.defer = true;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const tree = (id: number) => (
    <QueryClientProvider client={client}>
      <CachedConnection />
      <ReissueLinkButton
        subscription={{ is_active: true, is_limited: false, is_trial: false } as Subscription}
        subscriptionId={id}
      />
    </QueryClientProvider>
  );
  const { rerender } = render(tree(10));
  await screen.findByText(/old-link old-app/);
  fireEvent.click(screen.getByRole('button'));
  await vi.waitFor(() => expect(state.release).toBeTypeOf('function'));
  rerender(tree(11));
  state.release?.();
  await screen.findByText(/new-link new-app/);
  expect(screen.queryByRole('status')).toBeNull();
  expect(localStorage.getItem('revoke_ts_11')).toBeNull();
  expect(localStorage.getItem('revoke_ts_10')).not.toBeNull();
  rerender(tree(10));
  expect(screen.getByRole('status')).toBeTruthy();
  expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  client.clear();
});
