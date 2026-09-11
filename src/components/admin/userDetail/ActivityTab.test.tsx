// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { UserActivityItem, UserActivityResponse } from '@/api/adminUsers';

/**
 * Вкладка «Активность» показывает след человека по-человечески: открытый экран —
 * как экран с его названием, действие в кабинете — как действие, записи
 * Mini App — не сырой строкой «miniapp_action», а с подписью и источником.
 * Фильтр «Клики» включает и Mini App.
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
  ],
  total: 7,
  offset: 0,
  limit: 25,
};

vi.mock('@/api/adminUsers', () => ({
  adminUsersApi: {
    getUserActivity: (_userId: number, _offset: number, _limit: number, types?: string) => {
      requested.push(types ?? 'all');
      return Promise.resolve(response);
    },
  },
}));

import { ActivityTab } from './ActivityTab';

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

beforeEach(() => {
  requested.length = 0;
});
afterEach(cleanup);

it('экраны и действия подписаны по-человечески, Mini App не сырой строкой', async () => {
  render(<ActivityTab userId={7} formatDate={(d) => String(d)} />);

  expect(await screen.findAllByText('Открыл экран')).toHaveLength(2);
  expect(screen.getAllByText('Подписка')).toHaveLength(2);
  expect(screen.getByText('Активация триала')).toBeTruthy();
  // Незнакомое действие — как есть, но не пропадает.
  expect(screen.getByText('POST /cabinet/unknown/thing')).toBeTruthy();
  expect(screen.getByText('Оплата')).toBeTruthy();
  expect(screen.getByText('Mini App')).toBeTruthy();
  expect(screen.queryByText('miniapp_action')).toBeNull();
  // Нажатие — заголовок «Нажал» и подпись кнопки; сообщение — вид без содержимого.
  expect(screen.getByText('Нажал')).toBeTruthy();
  expect(screen.getByText('Скопировать ключ')).toBeTruthy();
  expect(screen.getByText('Сообщение боту')).toBeTruthy();
  expect(screen.getByText('фото')).toBeTruthy();
});

it('фильтр «Клики» запрашивает и Mini App', async () => {
  render(<ActivityTab userId={7} formatDate={(d) => String(d)} />);
  await screen.findAllByText('Открыл экран');

  fireEvent.click(screen.getByText('Клики'));

  await waitFor(() =>
    expect(requested[requested.length - 1]).toBe('button_click,cabinet_action,miniapp_action'),
  );
});
