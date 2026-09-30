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
