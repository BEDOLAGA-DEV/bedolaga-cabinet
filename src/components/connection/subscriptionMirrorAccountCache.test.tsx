// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { subscriptionApi } from '@/api/subscription';
import { useAuthStore } from '@/store/auth';
import type { User } from '@/types';
import { SubscriptionMirrorSelector } from './SubscriptionMirrorSelector';
vi.mock('./MirrorSelector', () => ({
  MirrorSelector: ({ selection }: { selection: { url: string | null } }) => (
    <output data-testid="selected-url">{selection.url}</output>
  ),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null });
});
it('never reuses the previous account connection DTO when the active account changes', async () => {
  const dto = (token: string) => ({
    subscription_id: 7,
    subscription_url: `https://primary.example/sub/${token}`,
    display_link: null,
    happ_redirect_link: null,
    happ_scheme_link: null,
    connect_mode: 'guide',
    hide_link: false,
    mirrors: [],
    instructions: { steps: [] },
  });
  const request = vi
    .spyOn(subscriptionApi, 'getConnectionLink')
    .mockResolvedValueOnce(dto('first-account'));
  let resolveSecond!: (value: ReturnType<typeof dto>) => void;
  request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
  );
  useAuthStore.setState({ user: { id: 91 } as User });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SubscriptionMirrorSelector subscriptionId={7} />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId('selected-url').textContent).toContain('first-account'),
  );
  act(() => useAuthStore.setState({ user: { id: 92 } as User }));
  expect(screen.getByTestId('selected-url').textContent).not.toContain('first-account');
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  await act(async () => resolveSecond(dto('second-account')));
  await waitFor(() =>
    expect(screen.getByTestId('selected-url').textContent).toContain('second-account'),
  );
});
