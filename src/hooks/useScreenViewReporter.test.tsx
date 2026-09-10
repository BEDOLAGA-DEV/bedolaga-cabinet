// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

/**
 * «Активность» должна видеть каждый шаг: сервер узнаёт об открытии каждого
 * экрана кабинета. Экраны админки не отправляются (у админа свой журнал),
 * без авторизации — тоже; двойной запуск эффекта в StrictMode — один отчёт.
 */

const reportScreen = vi.fn((_path: string) => Promise.resolve());
vi.mock('@/api/activity', () => ({
  activityApi: { reportScreen: (path: string) => reportScreen(path) },
}));

let authenticated = true;
vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: authenticated }),
}));

import { ScreenViewReporter } from '@/components/ScreenViewReporter';

let go: ((to: string) => void) | null = null;

function Probe() {
  go = useNavigate();
  return <ScreenViewReporter />;
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

beforeEach(() => {
  reportScreen.mockClear();
  authenticated = true;
});
afterEach(cleanup);

it('открытие экрана отправляется один раз, несмотря на StrictMode', () => {
  renderAt('/subscription');

  expect(reportScreen.mock.calls).toEqual([['/subscription']]);
});

it('смена пути — новый отчёт, query в путь не попадает', () => {
  renderAt('/subscription');
  act(() => go?.('/balance?token=secret'));

  expect(reportScreen.mock.calls).toEqual([['/subscription'], ['/balance']]);
});

it('экраны админки не отправляются', () => {
  renderAt('/admin/users');
  act(() => go?.('/profile'));

  expect(reportScreen.mock.calls).toEqual([['/profile']]);
});

it('без авторизации ничего не уходит', () => {
  authenticated = false;
  renderAt('/subscription');

  expect(reportScreen).not.toHaveBeenCalled();
});
