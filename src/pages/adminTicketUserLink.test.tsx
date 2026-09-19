// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { AdminTicketDetail, AdminTicketUser } from '@/api/admin';

/**
 * Имя автора тикета в шапке карточки — ссылка на его профиль. Раньше оно было
 * обычным текстом, и найти пользователя по имени приходилось руками через
 * список: переход прятался в отдельном чипе рядом.
 *
 * Тест держит именно контракт «имя = ссылка на /admin/users/:id», а не вёрстку:
 * ломается он только если имя перестало быть ссылкой или id уехал.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const ticketUser: AdminTicketUser = {
  id: 42,
  telegram_id: 777,
  username: 'ivan',
  first_name: 'Иван',
  last_name: 'Петров',
};

const ticketDetail = (user: AdminTicketUser | null): AdminTicketDetail => ({
  id: 1,
  title: 'Не работает подписка',
  status: 'open',
  priority: 'high',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  closed_at: null,
  is_reply_blocked: false,
  user,
  messages: [],
});

const getTicket = vi.fn();

vi.mock('@/api/admin', () => ({
  adminApi: {
    getTicketStats: () =>
      Promise.resolve({ total: 1, open: 1, pending: 0, answered: 0, closed: 0 }),
    getTickets: () => Promise.resolve({ items: [], total: 0, page: 1, per_page: 20, pages: 1 }),
    getTicket: (id: number) => getTicket(id),
    updateTicketStatus: () => Promise.resolve(),
    replyToTicket: () => Promise.resolve(),
  },
}));

// jsdom не реализует matchMedia, а тема и фоны его спрашивают.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// Значение подставляет vite через define; в тестах его нет.
(globalThis as Record<string, unknown>).__APP_VERSION__ ??= '0.0.0-test';

afterEach(cleanup);
beforeEach(() => getTicket.mockReset());

async function renderTicket() {
  const AdminTickets = (await import('./AdminTickets')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/admin/tickets/1']}>
          <Routes>
            <Route path="/admin/tickets/:ticketId" element={<AdminTickets />} />
          </Routes>
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

describe('имя пользователя в карточке тикета', () => {
  it('ведёт на профиль автора', async () => {
    getTicket.mockResolvedValue(ticketDetail(ticketUser));
    await renderTicket();

    const link = await screen.findByRole('link', { name: 'Иван Петров' });
    expect(link.getAttribute('href')).toBe('/admin/users/42');
  });

  it('остаётся текстом, когда автор недоступен', async () => {
    getTicket.mockResolvedValue(ticketDetail(null));
    await renderTicket();

    expect(await screen.findByText(/Unknown/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Unknown/ })).toBeNull();
  });
});
