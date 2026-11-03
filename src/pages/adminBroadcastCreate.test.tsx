// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * Email-рассылка по промогруппе и одному человеку (issue бота #3271): раньше были
 * только фильтры по регистрации, подписке и активности, а письмо одному клиенту
 * приходилось слать руками через API почтового провайдера.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) =>
      opts && typeof opts === 'object' && 'name' in opts
        ? `${key}:${String((opts as { name: unknown }).name)}`
        : key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const api = vi.hoisted(() => ({
  getFilters: vi.fn(),
  uploadMedia: vi.fn(),
  getTariffs: vi.fn(),
  getEmailFilters: vi.fn(),
  getButtons: vi.fn(),
  preview: vi.fn(),
  previewEmail: vi.fn(),
  previewAudience: vi.fn(),
  createCombined: vi.fn(),
}));

vi.mock('../api/adminBroadcasts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/adminBroadcasts')>();
  return { ...actual, adminBroadcastsApi: { ...actual.adminBroadcastsApi, ...api } };
});

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.getFilters.mockResolvedValue({ filters: [], tariff_filters: [], custom_filters: [] });
  api.getButtons.mockResolvedValue({ buttons: [] });
  api.getTariffs.mockResolvedValue({ tariffs: [] });
  api.getEmailFilters.mockResolvedValue({
    filters: [{ key: 'all_email', label: 'Все с email', count: 10, group: 'basic' }],
    promo_group_filters: [
      { key: 'promo_group_7', label: 'Продвинутый', count: 3, group: 'promo_group' },
    ],
  });
  api.previewEmail.mockImplementation(async (target: string) => ({
    target,
    count: target === 'user_42' ? 1 : 3,
  }));
  api.previewAudience.mockImplementation(async ({ audience }) => ({
    count: audience.conditions[0]?.field === 'email_user' ? 1 : 3,
    offset: 0,
    limit: 50,
    users: [],
  }));
  api.createCombined.mockResolvedValue({ id: 900 });
});
afterEach(cleanup);

async function renderPage(entry: string | { pathname: string; search: string; state: unknown }) {
  const AdminBroadcastCreate = (await import('./AdminBroadcastCreate')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/admin/broadcasts/create" element={<AdminBroadcastCreate />} />
            <Route path="/admin/broadcasts/:id" element={<div>detail</div>} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

describe('AdminBroadcastCreate — email-адресаты', () => {
  it('из карточки пользователя: email-канал включён, адресат — один человек', async () => {
    await renderPage({
      pathname: '/admin/broadcasts/create',
      search: '?email_user=42',
      state: { emailUserLabel: 'egor@example.com' },
    });

    await waitFor(() =>
      expect(api.previewAudience).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          audience: {
            conditions: [
              expect.objectContaining({ field: 'email_user', operator: 'eq', value: '42' }),
            ],
          },
        }),
      ),
    );
    expect((screen.getByRole('combobox', { name: 'Email' }) as HTMLInputElement).value).toBe(
      'egor@example.com',
    );

    fireEvent.change(screen.getByPlaceholderText('admin.broadcasts.emailSubjectPlaceholder'), {
      target: { value: 'Тема' },
    });
    fireEvent.change(screen.getByPlaceholderText('admin.broadcasts.emailContentPlaceholder'), {
      target: { value: '<p>Привет</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'admin.broadcasts.send' }));

    await waitFor(() =>
      expect(api.createCombined).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          audience: {
            conditions: [
              expect.objectContaining({ field: 'email_user', operator: 'eq', value: '42' }),
            ],
          },
        }),
        expect.anything(),
      ),
    );
  });

  it('после перезагрузки без state подпись — по id', async () => {
    await renderPage('/admin/broadcasts/create?email_user=42');
    expect(
      ((await screen.findByRole('combobox', { name: 'Email' })) as HTMLInputElement).value,
    ).toBe('#42');
  });

  it('промогруппы — отдельной группой фильтров email', async () => {
    await renderPage('/admin/broadcasts/create');
    fireEvent.click(screen.getByText('admin.broadcasts.enableEmail'));
    const fields = await screen.findAllByRole('combobox', {
      name: 'admin.broadcasts.audience.field',
    });
    fireEvent.change(fields[1], { target: { value: 'promo_group' } });
    const values = screen.getAllByRole('combobox', { name: 'admin.broadcasts.audience.value' });
    fireEvent.change(values[1], { target: { value: 'promo_group_7' } });

    await waitFor(() =>
      expect(api.previewAudience).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          audience: {
            conditions: [expect.objectContaining({ field: 'promo_group', value: 'promo_group_7' })],
          },
        }),
      ),
    );
  });

  it('мусор в email_user игнорируется — обычная форма', async () => {
    await renderPage('/admin/broadcasts/create?email_user=abc');
    expect(screen.queryByRole('combobox', { name: 'Email' })).toBeNull();
    expect(api.previewEmail).not.toHaveBeenCalled();
  });
});

it('показывает отказ API, сохраняя текст рассылки', async () => {
  const { AxiosError } = await import('axios');
  api.createCombined.mockRejectedValue(
    new AxiosError('Bad request', '400', undefined, undefined, {
      data: { detail: 'Текст слишком длинный для сообщения с медиа' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    }),
  );
  await renderPage('/admin/broadcasts/create?email_user=42');
  fireEvent.change(screen.getByPlaceholderText('admin.broadcasts.emailSubjectPlaceholder'), {
    target: { value: 'Subject' },
  });
  fireEvent.change(screen.getByPlaceholderText('admin.broadcasts.emailContentPlaceholder'), {
    target: { value: 'Draft content' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'admin.broadcasts.send' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Текст слишком длинный');
  expect(
    (screen.getByPlaceholderText('admin.broadcasts.emailContentPlaceholder') as HTMLTextAreaElement)
      .value,
  ).toBe('Draft content');
});

it('проверяет длину подписи, позволяет длинный текст без медиа и не считает HTML-теги', async () => {
  api.uploadMedia.mockResolvedValue({ file_id: 'A'.repeat(32) });
  await renderPage('/admin/broadcasts/create');
  fireEvent.change(screen.getByRole('combobox', { name: 'admin.broadcasts.audience.field' }), {
    target: { value: 'basic' },
  });
  const input = screen.getByPlaceholderText('admin.broadcasts.messageTextPlaceholder');
  const send = screen.getByRole('button', { name: 'admin.broadcasts.send' }) as HTMLButtonElement;
  fireEvent.change(input, { target: { value: 'x'.repeat(1100) } });
  expect(send.disabled).toBe(false);
  fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, {
    target: { files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })] },
  });
  await waitFor(() => expect(api.uploadMedia).toHaveBeenCalled());
  expect((await screen.findByRole('alert')).textContent).toContain(
    'admin.broadcasts.captionTooLong',
  );
  expect(send.disabled).toBe(true);
  fireEvent.change(input, { target: { value: `<b>${'x'.repeat(1024)}</b>` } });
  await waitFor(() => expect(send.disabled).toBe(false));
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(send);
  await waitFor(() =>
    expect(api.createCombined).toHaveBeenCalledWith(
      expect.objectContaining({
        media: { type: 'document', file_id: 'A'.repeat(32) },
        message_text: `<b>${'x'.repeat(1024)}</b>`,
      }),
      expect.anything(),
    ),
  );
});

it('при частичном успехе двух каналов не отправляет Telegram повторно', async () => {
  api.createCombined
    .mockResolvedValueOnce({ id: 900 })
    .mockRejectedValueOnce(new Error('Email unavailable'));
  await renderPage('/admin/broadcasts/create');
  fireEvent.click(screen.getByText('admin.broadcasts.enableEmail'));
  const fields = screen.getAllByRole('combobox', { name: 'admin.broadcasts.audience.field' });
  for (const field of fields) fireEvent.change(field, { target: { value: 'basic' } });
  fireEvent.change(screen.getByPlaceholderText('admin.broadcasts.messageTextPlaceholder'), {
    target: { value: 'Telegram draft' },
  });
  fireEvent.change(screen.getByPlaceholderText('admin.broadcasts.emailSubjectPlaceholder'), {
    target: { value: 'Subject' },
  });
  fireEvent.change(screen.getByPlaceholderText('admin.broadcasts.emailContentPlaceholder'), {
    target: { value: 'Email draft' },
  });
  const send = screen.getByRole('button', { name: 'admin.broadcasts.send' }) as HTMLButtonElement;
  fireEvent.click(send);
  expect((await screen.findByRole('alert')).textContent).toContain('admin.broadcasts.partialSend');
  expect(send.disabled).toBe(true);
  fireEvent.click(send);
  expect(api.createCombined).toHaveBeenCalledTimes(2);
});
