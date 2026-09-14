// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { UserActivityItem, UserActivityResponse } from '@/api/adminUsers';
import { installMatchMedia } from '@/components/admin/reachability/testUtils';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * «Активность» пишет след человека по-человечески: заголовок — что произошло,
 * подпись — одна полезная деталь. Сырых кодов («successful_payment»,
 * «GRACE_GRANTED», «miniapp_action») и бейджей источника на экране нет.
 */

vi.mock('react-i18next', async () =>
  (await import('@/components/admin/reachability/testUtils')).i18nMock(),
);

const requested: string[] = [];
const response: UserActivityResponse = {
  items: [
    item({
      type: 'cabinet_action',
      subtype: 'screen',
      source: 'cabinet',
      title: '/subscriptions/{id}',
    }),
    item({
      type: 'miniapp_action',
      subtype: 'screen',
      source: 'miniapp',
      title: '/miniapp/subscription',
    }),
    item({ type: 'cabinet_action', source: 'cabinet', title: 'POST /cabinet/subscription/trial' }),
    item({ type: 'cabinet_action', source: 'cabinet', title: 'POST /cabinet/unknown/thing' }),
    item({ type: 'button_click', subtype: 'payment', source: 'bot', title: 'successful_payment' }),
    item({
      type: 'cabinet_action',
      subtype: 'click',
      source: 'cabinet',
      title: 'Скопировать ключ',
    }),
    item({ type: 'button_click', subtype: 'message', source: 'bot', title: 'photo' }),
    item({ type: 'event', subtype: 'grace_granted', title: 'Выдан временный доступ' }),
    item({
      type: 'transaction',
      subtype: 'subscription_payment',
      title: 'Продление 90 дней',
      amount_kopeks: -212500,
      meta: { payment_method: 'balance' },
    }),
  ],
  total: 9,
  offset: 0,
  limit: 25,
};

vi.mock('@/api/adminUsers', () => ({
  adminUsersApi: {
    getUserActivity: (_userId: number, _offset: number, _limit: number, types?: string) => {
      requested.push(types ?? 'all');
      return Promise.resolve(response);
    },
    getUserGifts: () =>
      Promise.resolve({ sent: [], received: [], sent_total: 0, received_total: 0 }),
  },
}));

import { ActivityHub, type ActivityView } from './ActivityHub';

function item(partial: Partial<UserActivityItem>): UserActivityItem {
  return {
    type: 'event',
    subtype: null,
    source: null,
    title: null,
    amount_kopeks: null,
    timestamp: '2026-09-10T10:00:00Z',
    meta: null,
    ...partial,
  } as UserActivityItem;
}

function Hub({
  view = 'all',
  onViewChange = () => {},
}: {
  view?: ActivityView;
  onViewChange?: (v: ActivityView) => void;
}) {
  return (
    <ActivityHub userId={7} view={view} onViewChange={onViewChange} onNavigateToUser={() => {}} />
  );
}

/** Провайдеры запросов, платформы и роутера — обёрткой, чтобы `rerender` их не терял. */
function renderHub(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper });
}

beforeAll(installMatchMedia);
beforeEach(() => {
  requested.length = 0;
});
afterEach(cleanup);

it('заголовок и одна подпись — по-человечески, без сырых кодов', async () => {
  renderHub(<Hub />);

  expect(await screen.findByText('Активация триала')).toBeTruthy();
  expect(screen.getAllByText('Открыл экран')).toHaveLength(2);
  // Незнакомое действие — как есть, но не пропадает.
  expect(screen.getByText('POST /cabinet/unknown/thing')).toBeTruthy();
  // Оплата в боте — словом, служебная строка не видна.
  expect(screen.getByText('Оплата')).toBeTruthy();
  expect(screen.queryByText('successful_payment')).toBeNull();
  // Нажатие — подпись кнопки и «Нажал»; сообщение — вид без содержимого.
  expect(screen.getByText('Скопировать ключ')).toBeTruthy();
  expect(screen.getByText('Нажал')).toBeTruthy();
  expect(screen.getByText('фото')).toBeTruthy();
  // Событие без бейджа подтипа, трата — со знаком минус и способом оплаты.
  expect(screen.getByText('Выдан временный доступ')).toBeTruthy();
  expect(screen.queryByText(/grace_granted/i)).toBeNull();
  expect(screen.getByText('Продление 90 дней')).toBeTruthy();
  expect(screen.getByText('с баланса')).toBeTruthy();
  expect(screen.getByText(/^−2\s?125/)).toBeTruthy();
  expect(screen.queryByText('miniapp_action')).toBeNull();
  expect(screen.queryByText('Mini App')).toBeNull();
});

it('фильтр «Действия» запрашивает нажатия бота и кабинета вместе', async () => {
  const onViewChange = vi.fn();
  const { rerender } = renderHub(<Hub onViewChange={onViewChange} />);
  await screen.findByText('Активация триала');

  fireEvent.click(screen.getByRole('radio', { name: 'Действия' }));
  expect(onViewChange).toHaveBeenCalledWith('actions');

  rerender(<Hub view="actions" onViewChange={onViewChange} />);
  await waitFor(() =>
    expect(requested[requested.length - 1]).toBe(
      'button_click,cabinet_action,miniapp_action,wheel_spin,poll',
    ),
  );
});
