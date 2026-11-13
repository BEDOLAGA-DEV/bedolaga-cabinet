// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import ConnectionQR from './ConnectionQR';

vi.mock('../hooks/useBranding', () => ({ useBranding: () => ({ appName: 'Example' }) }));
vi.mock('../platform', () => ({ usePlatform: () => ({ platform: 'web' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const url = `happ://crypt4/${'aB09'.repeat(175)}`;
const writeText = vi.fn();
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function page(
  state: unknown = { url, hideLink: false, subscriptionId: 7 },
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  writeText.mockReset().mockResolvedValue(undefined);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/connection/qr', state }]}>
        <Routes>
          <Route path="/connection/qr" element={<ConnectionQR />} />
          <Route path="/connection" element={<div>Connection screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it.each(['https://vpn.example.com/sub/local', url])(
  'copies the entire link and confirms only after clipboard success: %s',
  async (url) => {
    page({ url, hideLink: false, subscriptionId: 7 });
    const button = screen.getByRole('button', { name: 'subscription.connection.copyLink' });
    expect(screen.getByText(url).textContent).toBe(url);
    let complete: (() => void) | undefined;
    writeText.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    fireEvent.click(button);
    expect(screen.queryByText('common.copied')).toBeNull();
    expect(button.hasAttribute('disabled')).toBe(true);
    complete?.();
    await screen.findByText('common.copied');
    expect(writeText).toHaveBeenCalledWith(url);
  },
);
it('keeps the QR while hiding both the text and copy action', () => {
  const { container } = page({ url, hideLink: true });
  expect(container.querySelector('svg')).toBeTruthy();
  expect(screen.queryByText(url)).toBeNull();
  expect(screen.queryByRole('button', { name: 'subscription.connection.copyLink' })).toBeNull();
});
it('reports clipboard failure and retains selectable full text for manual copying', async () => {
  page();
  writeText.mockRejectedValueOnce(new Error('Clipboard denied'));
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
  fireEvent.click(screen.getByRole('button', { name: 'subscription.connection.copyLink' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'subscription.connection.copyFailed',
  );
  expect(screen.queryByText('common.copied')).toBeNull();
  expect(screen.getByText(url).textContent).toBe(url);
  expect(document.querySelector('textarea')).toBeNull();
});
it('uses the existing WebView fallback when the clipboard API is unavailable', async () => {
  page();
  writeText.mockRejectedValueOnce(new Error('Not available'));
  let copied = '';
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: vi.fn(() => {
      copied = document.querySelector('textarea')?.value ?? '';
      return true;
    }),
  });
  fireEvent.click(screen.getByRole('button', { name: 'subscription.connection.copyLink' }));
  await screen.findByText('common.copied');
  expect(copied).toBe(url);
  expect(document.querySelector('textarea')).toBeNull();
});
it('redirects a direct visit without valid navigation state', async () => {
  page(null);
  await waitFor(() => expect(screen.getByText('Connection screen')).toBeTruthy());
});

it('refreshes scoped navigation and never shows the stale token while loading', async () => {
  const { subscriptionApi } = await import('@/api/subscription');
  const freshUrl = 'https://primary.example/sub/reissued';
  const request = vi.spyOn(subscriptionApi, 'getConnectionLink').mockResolvedValue({
    subscription_id: 7,
    subscription_url: freshUrl,
    display_link: freshUrl,
    happ_redirect_link: null,
    happ_scheme_link: null,
    connect_mode: 'guide',
    hide_link: false,
    mirrors: [],
    instructions: { steps: [] },
  });
  page({
    url: 'https://primary.example/sub/old',
    hideLink: false,
    subscriptionId: 7,
    refreshConnection: true,
  });
  expect(screen.queryByText('https://primary.example/sub/old')).toBeNull();
  expect(await screen.findByText(freshUrl)).toBeTruthy();
  expect(request).toHaveBeenCalledWith(7);
  fireEvent.click(screen.getByRole('button', { name: 'subscription.connection.copyLink' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(freshUrl));
});

it('respects the current hide policy after scoped refresh', async () => {
  const { subscriptionApi } = await import('@/api/subscription');
  vi.spyOn(subscriptionApi, 'getConnectionLink').mockResolvedValue({
    subscription_id: 7,
    subscription_url: url,
    display_link: url,
    happ_redirect_link: null,
    happ_scheme_link: url,
    connect_mode: 'happ_cryptolink',
    hide_link: true,
    mirrors: [],
    instructions: { steps: [] },
  });
  const view = page({
    url: 'https://primary.example/sub/old',
    hideLink: false,
    subscriptionId: 7,
    refreshConnection: true,
  });
  await waitFor(() => expect(view.container.querySelector('svg')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'subscription.connection.copyLink' })).toBeNull();
  expect(screen.queryByText(url)).toBeNull();
});
it('returns to connection when refreshed data belongs to another subscription', async () => {
  const { subscriptionApi } = await import('@/api/subscription');
  vi.spyOn(subscriptionApi, 'getConnectionLink').mockResolvedValue({
    subscription_id: 8,
    subscription_url: url,
    display_link: url,
    happ_redirect_link: null,
    happ_scheme_link: url,
    connect_mode: 'guide',
    hide_link: false,
    mirrors: [],
    instructions: { steps: [] },
  });
  page({ url, hideLink: false, subscriptionId: 7, refreshConnection: true });
  expect(await screen.findByText('Connection screen')).toBeTruthy();
});

const missingConnectionUrl = (hideLink: boolean) => ({
  subscription_id: 7,
  subscription_url: null,
  display_link: null,
  happ_redirect_link: null,
  happ_scheme_link: null,
  connect_mode: 'guide',
  hide_link: hideLink,
  mirrors: [],
  instructions: { steps: [] },
});
const freshAppConfig = (subscriptionUrl: string | null) => ({
  subscriptionUrl,
  hasSubscription: Boolean(subscriptionUrl),
  hideLink: true,
  platformNames: {},
  platforms: {},
});
it('keeps hidden QR available using a freshly fetched scoped app config, never route state', async () => {
  const { subscriptionApi } = await import('@/api/subscription');
  const { QRCodeSVG } = await import('qrcode.react');
  const freshUrl = 'https://primary.example/sub/fresh-hidden';
  vi.spyOn(subscriptionApi, 'getConnectionLink').mockResolvedValue(missingConnectionUrl(true));
  const config = vi
    .spyOn(subscriptionApi, 'getAppConfig')
    .mockResolvedValue(freshAppConfig(freshUrl));
  const view = page({
    url: 'https://primary.example/sub/stale',
    hideLink: false,
    subscriptionId: 7,
    refreshConnection: true,
  });
  await waitFor(() => expect(view.container.querySelector('svg')).toBeTruthy());
  expect(config).toHaveBeenCalledWith(7);
  const reference = render(<QRCodeSVG value={freshUrl} level="M" />);
  expect(view.container.querySelector('svg[width="280"] path:last-child')?.getAttribute('d')).toBe(
    reference.container.querySelector('svg path:last-child')?.getAttribute('d'),
  );
  expect(view.container.textContent).not.toContain(freshUrl);
  expect(view.container.textContent).not.toContain('https://primary.example/sub/stale');
  expect(screen.queryByRole('button', { name: 'subscription.connection.copyLink' })).toBeNull();
});
it.each([false, true])(
  'leaves the QR page when fresh data has no usable URL (hidden=%s)',
  async (hidden) => {
    const { subscriptionApi } = await import('@/api/subscription');
    vi.spyOn(subscriptionApi, 'getConnectionLink').mockResolvedValue(missingConnectionUrl(hidden));
    vi.spyOn(subscriptionApi, 'getAppConfig').mockResolvedValue(freshAppConfig(null));
    page({
      url: 'https://primary.example/sub/stale',
      hideLink: false,
      subscriptionId: 7,
      refreshConnection: true,
    });
    expect(await screen.findByText('Connection screen')).toBeTruthy();
    expect(screen.queryByText('https://primary.example/sub/stale')).toBeNull();
  },
);
it('does not reuse route state when the scoped hidden app config fails ownership checks', async () => {
  const { subscriptionApi } = await import('@/api/subscription');
  vi.spyOn(subscriptionApi, 'getConnectionLink').mockResolvedValue(missingConnectionUrl(true));
  const request = vi
    .spyOn(subscriptionApi, 'getAppConfig')
    .mockRejectedValue({ response: { status: 404 } });
  page({
    url: 'https://primary.example/sub/stale',
    hideLink: false,
    subscriptionId: 7,
    refreshConnection: true,
  });
  expect(await screen.findByText('Connection screen')).toBeTruthy();
  expect(request).toHaveBeenCalledWith(7);
  expect(screen.queryByText('https://primary.example/sub/stale')).toBeNull();
});
it('waits for the hidden config refresh instead of encoding a cached token', async () => {
  const { subscriptionApi } = await import('@/api/subscription');
  const { useAuthStore } = await import('@/store/auth');
  const { QRCodeSVG } = await import('qrcode.react');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(
    ['appConfig', 7, useAuthStore.getState().user?.id],
    freshAppConfig('https://primary.example/sub/cached'),
  );
  vi.spyOn(subscriptionApi, 'getConnectionLink').mockResolvedValue(missingConnectionUrl(true));
  let resolveConfig!: (config: ReturnType<typeof freshAppConfig>) => void;
  const request = vi.spyOn(subscriptionApi, 'getAppConfig').mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveConfig = resolve;
      }),
  );
  const view = page(
    {
      url: 'https://primary.example/sub/history',
      hideLink: true,
      subscriptionId: 7,
      refreshConnection: true,
    },
    client,
  );
  await waitFor(() => expect(request).toHaveBeenCalledWith(7));
  expect(view.container.querySelector('svg[width="280"]')).toBeNull();
  await act(async () => resolveConfig(freshAppConfig('https://primary.example/sub/current')));
  await waitFor(() => expect(view.container.querySelector('svg[width="280"]')).toBeTruthy());
  const expected = render(<QRCodeSVG value="https://primary.example/sub/current" level="M" />);
  expect(view.container.querySelector('svg[width="280"] path:last-child')?.getAttribute('d')).toBe(
    expected.container.querySelector('svg path:last-child')?.getAttribute('d'),
  );
});
