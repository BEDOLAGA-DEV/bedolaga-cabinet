// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { ToastProvider } from '@/components/Toast';
import type { EmailQueueState } from '@/api/adminEmailQueue';

/**
 * Очередь писем в разделе шаблонов.
 *
 * Раньше очередь жила только в базе: владелец без SMTP видел лишь сообщения
 * «Письмо потеряно» и не мог ни посмотреть очередь, ни очистить её. Карточка
 * объясняет состояние словами и даёт кнопки, а служебный текст ошибки наружу
 * не показывает.
 */

import ruLocale from '@/locales/ru.json';

function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown, options?: Record<string, unknown>) => {
      const params = (typeof fallback === 'object' ? fallback : options) as
        | Record<string, unknown>
        | undefined;
      const template = resolveRu(key) ?? (typeof fallback === 'string' ? fallback : key);
      return template.replace(/{{(\w+)}}/g, (_m, name) => String(params?.[name] ?? ''));
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const state: { payload: EmailQueueState } = {
  payload: { pending: 0, sent: 0, dead: 0, smtp_configured: true, items: [] },
};

vi.mock('@/api/adminEmailQueue', () => ({
  adminEmailQueueApi: {
    getQueue: () => Promise.resolve(state.payload),
    clearQueue: () => Promise.resolve({ removed: 0 }),
  },
}));

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
(globalThis as Record<string, unknown>).__APP_VERSION__ ??= '0.0.0-test';

afterEach(() => {
  cleanup();
  state.payload = { pending: 0, sent: 0, dead: 0, smtp_configured: true, items: [] };
});

async function renderCard() {
  const { EmailQueueCard } = await import('./EmailQueueCard');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <PlatformProvider>
          <EmailQueueCard />
        </PlatformProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('карточка очереди писем', () => {
  it('ничего из объяснений не обрезает: на телефоне фразы уходили в многоточие', async () => {
    state.payload = { pending: 1, sent: 0, dead: 0, smtp_configured: true, items: [] };
    const { container } = await renderCard();
    await screen.findByText(/не ушедшие с первого раза/);
    const clipped = Array.from(container.querySelectorAll('p'))
      .filter((node) => node.className.includes('truncate'))
      .map((node) => node.textContent || '');
    // Обрезка допустима только у длинных адресов и тем в списке писем.
    expect(clipped.some((text) => text.includes('первого раза'))).toBe(false);
    expect(clipped.some((text) => text.includes('в ожидании'))).toBe(false);
  });

  it('объясняет, что счётчики только про непрошедшие с первого раза письма', async () => {
    // Иначе «отправлено: 0» читается как «почта не работает», хотя обычные
    // письма сюда не попадают вовсе.
    state.payload = { pending: 0, sent: 0, dead: 0, smtp_configured: true, items: [] };
    await renderCard();
    expect(await screen.findByText(/не ушедшие с первого раза/)).toBeTruthy();
  });

  it('на пустой очереди показывает нули, а не исчезает', async () => {
    // Карточку ищут глазами в разделе писем: пустое место неотличимо от
    // «раздела нет» — именно так её и не нашли после обновления.
    await renderCard();
    expect(await screen.findByText(/Очередь писем/)).toBeTruthy();
    expect(screen.getAllByText('0')).toHaveLength(3);
  });

  it('сообщает, когда состояние очереди недоступно', async () => {
    const failing = await import('@/api/adminEmailQueue');
    const original = failing.adminEmailQueueApi.getQueue;
    failing.adminEmailQueueApi.getQueue = () => Promise.reject(new Error('404'));
    try {
      await renderCard();
      expect(await screen.findByText(/Состояние очереди писем недоступно/)).toBeTruthy();
    } finally {
      failing.adminEmailQueueApi.getQueue = original;
    }
  });

  it('объясняет словами, что почтовый сервер не настроен', async () => {
    state.payload = { ...state.payload, smtp_configured: false };
    await renderCard();
    expect(await screen.findByText(/Почтовый сервер не настроен/)).toBeTruthy();
  });

  it('показывает счётчики и кнопки очистки', async () => {
    state.payload = { pending: 2, sent: 5, dead: 1, smtp_configured: true, items: [] };
    await renderCard();
    expect(await screen.findByText('в ожидании')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Убрать ожидающие')).toBeTruthy();
    expect(screen.getByText('Очистить')).toBeTruthy();
  });

  it('без ожидающих писем кнопки «убрать ожидающие» нет', async () => {
    state.payload = { pending: 0, sent: 3, dead: 0, smtp_configured: true, items: [] };
    await renderCard();
    await screen.findByText('доставлены');
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('Убрать ожидающие')).toBeNull();
  });

  it('причину показывает фразой, а служебный текст ошибки не выводит', async () => {
    state.payload = {
      pending: 0,
      sent: 0,
      dead: 1,
      smtp_configured: false,
      items: [
        {
          id: 1,
          to_email: 'user@example.com',
          subject: 'Код подтверждения',
          status: 'dead',
          attempts: 1,
          next_attempt_at: null,
          last_error: 'SMTP не настроен — отправлять письмо некому',
          created_at: '2026-09-08T05:53:29Z',
          sent_at: null,
        },
      ],
    };
    const { container } = await renderCard();
    expect(await screen.findByText('user@example.com')).toBeTruthy();
    expect(container.textContent).not.toContain('отправлять письмо некому');
    expect(container.textContent).toContain('Не доставлено');
  });
});
