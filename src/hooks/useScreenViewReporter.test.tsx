// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivityEvent } from '@/api/activity';

/**
 * «Активность» должна видеть каждый шаг: сервер узнаёт об открытии каждого
 * экрана кабинета и о каждом нажатии. Экраны админки не отправляются (у админа
 * свой журнал), без авторизации — тоже; двойной запуск эффекта в StrictMode —
 * один отчёт.
 */

const sent: ActivityEvent[][] = [];
vi.mock('@/api/activity', () => ({
  activityApi: {
    sendEvents: (events: ActivityEvent[]) => {
      sent.push(events);
      return Promise.resolve();
    },
  },
}));

let authenticated = true;
vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: authenticated }),
}));

import { ScreenViewReporter } from '@/components/ScreenViewReporter';
import { resetActivityTracker } from '@/utils/activityTracker';

let go: ((to: string) => void) | null = null;

function Probe() {
  go = useNavigate();
  return (
    <>
      <ScreenViewReporter />
      <button type="button">Скопировать ключ</button>
    </>
  );
}

function renderAt(path: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

const flushed = () => {
  vi.runAllTimers();
  return sent.flat();
};

beforeEach(() => {
  vi.useFakeTimers();
  resetActivityTracker();
  sent.length = 0;
  authenticated = true;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('открытие экрана отправляется один раз, несмотря на StrictMode', () => {
  renderAt('/subscription');

  expect(flushed()).toEqual([{ kind: 'screen', path: '/subscription' }]);
});

it('смена пути — новый экран, query в путь не попадает', () => {
  renderAt('/subscription');
  act(() => go?.('/balance?token=secret'));

  expect(flushed()).toEqual([
    { kind: 'screen', path: '/subscription' },
    { kind: 'screen', path: '/balance' },
  ]);
});

it('нажатие на кнопку уходит с подписью и экраном', () => {
  const { getByText } = renderAt('/subscription');
  act(() => getByText('Скопировать ключ').click());

  expect(flushed()).toEqual([
    { kind: 'screen', path: '/subscription' },
    { kind: 'click', path: '/subscription', label: 'Скопировать ключ' },
  ]);
});

it('экраны админки не отправляются', () => {
  renderAt('/admin/users');
  act(() => go?.('/profile'));

  expect(flushed()).toEqual([{ kind: 'screen', path: '/profile' }]);
});

it('без авторизации ничего не уходит', () => {
  authenticated = false;
  const { getByText } = renderAt('/subscription');
  act(() => getByText('Скопировать ключ').click());

  expect(flushed()).toEqual([]);
});
