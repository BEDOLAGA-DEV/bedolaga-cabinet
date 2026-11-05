// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
function page(state: unknown = { url, hideLink: false, subscriptionId: 7 }) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  writeText.mockReset().mockResolvedValue(undefined);
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/connection/qr', state }]}>
      <Routes>
        <Route path="/connection/qr" element={<ConnectionQR />} />
        <Route path="/connection" element={<div>Connection screen</div>} />
      </Routes>
    </MemoryRouter>,
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
