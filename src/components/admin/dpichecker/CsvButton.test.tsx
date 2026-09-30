// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { CsvButton } from './CsvButton';

/**
 * CSV и в браузере, и в Mini App: бот даёт короткую подписанную ссылку, платформа качает её сама
 * (в Telegram — штатный downloadFile; `<a download>` там выкидывал из приложения).
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

const platform = vi.hoisted(() => ({ downloadFile: vi.fn(async () => undefined) }));
vi.mock('@/platform', () => ({ usePlatform: () => platform }));

const api = vi.hoisted(() => ({ downloadLink: vi.fn() }));
vi.mock('@/api/dpichecker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/dpichecker')>()),
  dpicheckerApi: api,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderButton = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CsvButton kind="report" actionId={11} />
    </QueryClientProvider>,
  );

it('берёт подписанную ссылку у бота и отдаёт её платформе с именем файла', async () => {
  api.downloadLink.mockResolvedValue({
    url: 'https://bot.example/f?token=1.a',
    file_name: 'dpichecker_11.csv',
  });
  renderButton();
  fireEvent.click(screen.getByRole('button', { name: /CSV/ }));
  await waitFor(() =>
    expect(platform.downloadFile).toHaveBeenCalledWith(
      'https://bot.example/f?token=1.a',
      'dpichecker_11.csv',
    ),
  );
  expect(api.downloadLink).toHaveBeenCalledWith('report', 11);
});

it('бот не дал ссылку — ошибка словами, а не тишина', async () => {
  api.downloadLink.mockRejectedValue(new Error('boom'));
  renderButton();
  fireEvent.click(screen.getByRole('button', { name: /CSV/ }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(platform.downloadFile).not.toHaveBeenCalled();
});
