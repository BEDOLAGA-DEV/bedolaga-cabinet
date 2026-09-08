// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Кнопка «назад» в админке.
 *
 * Экран объявляет одного родителя, но открывают его из разных мест. Пока родитель
 * был единственной правдой, «Уровни наград» из меню уводили в Настройки
 * партнёрской программы, а карточка пользователя из Дашборда — в список
 * пользователей: админ оказывался на экранах, которых не открывал.
 *
 * Здесь держится сам договор: точка входа кладёт свой путь в состояние перехода,
 * кнопка его чтит, а объявленный родитель остаётся запасным вариантом.
 */

let platform: 'web' | 'telegram' = 'web';

vi.mock('@/platform', async () => {
  const actual = await vi.importActual<typeof import('@/platform')>('@/platform');
  return { ...actual, usePlatform: () => ({ platform }) };
});

const { AdminBackButton, backTo, resolveAdminBackTarget } = await import('./AdminBackButton');

function renderAt(entry: string | { pathname: string; state?: unknown }, to?: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="*" element={<AdminBackButton to={to} />} />
      </Routes>
    </MemoryRouter>,
  );
}

function backHref(): string | null {
  return screen.getByRole('link').getAttribute('href');
}

afterEach(() => {
  platform = 'web';
  cleanup();
});

describe('AdminBackButton', () => {
  it('без состояния ведёт в объявленного родителя', () => {
    renderAt('/admin/partners/settings', '/admin/partners');
    expect(backHref()).toBe('/admin/partners');
  });

  it('без объявленного родителя ведёт в корень админки', () => {
    renderAt('/admin/users/7');
    expect(backHref()).toBe('/admin');
  });

  it('возвращает туда, откуда экран открыли', () => {
    renderAt({ pathname: '/admin/users/7', state: { backTo: '/admin/dashboard' } }, '/admin/users');
    expect(backHref()).toBe('/admin/dashboard');
  });

  it('сохраняет параметры запроса точки входа', () => {
    renderAt(
      { pathname: '/admin/users/7', state: { backTo: '/admin/payments?page=3' } },
      '/admin/users',
    );
    expect(backHref()).toBe('/admin/payments?page=3');
  });

  it('в Mini App уступает место родной кнопке Telegram', () => {
    platform = 'telegram';
    const { container } = renderAt('/admin/users/7', '/admin/users');
    expect(container.innerHTML).toBe('');
  });
});

describe('resolveAdminBackTarget', () => {
  it('не выпускает из кабинета по подделанному состоянию', () => {
    // Состояние перехода переживает перезагрузку и правится из консоли, поэтому
    // всё, что может увести на чужой домен, отбрасывается в пользу родителя.
    for (const hostile of ['//evil.example', 'https://evil.example', 'javascript:alert(1)']) {
      expect(resolveAdminBackTarget({ backTo: hostile }, '/admin')).toBe('/admin');
    }
  });

  it('игнорирует состояние без обратного пути', () => {
    for (const empty of [null, undefined, {}, { backTo: 42 }, 'строка']) {
      expect(resolveAdminBackTarget(empty, '/admin/users')).toBe('/admin/users');
    }
  });
});

describe('backTo', () => {
  it('запоминает адрес точки входа вместе с параметрами', () => {
    expect(backTo({ pathname: '/admin/payments', search: '?page=3' })).toEqual({
      state: { backTo: '/admin/payments?page=3' },
    });
  });

  it('обходится без параметров запроса', () => {
    expect(backTo({ pathname: '/admin/dashboard' })).toEqual({
      state: { backTo: '/admin/dashboard' },
    });
  });
});

/**
 * Сквозной проход: экран-вход отдаёт свой адрес, открытый экран возвращает на него.
 *
 * Обе формы передачи ходят по одному договору, но пишутся по-разному —
 * `navigate(path, backTo(location))` в обработчике и `{...backTo(location)}` на
 * ссылке, — поэтому проверяются обе.
 */
describe('переход и возврат', () => {
  function Entrance({ mode }: { mode: 'navigate' | 'link' }) {
    const location = useLocation();
    const navigate = useNavigate();
    if (mode === 'link') {
      return (
        <Link to="/admin/users/7" {...backTo(location)}>
          открыть
        </Link>
      );
    }
    return (
      <button type="button" onClick={() => navigate('/admin/users/7', backTo(location))}>
        открыть
      </button>
    );
  }

  function renderFlow(mode: 'navigate' | 'link', from: string) {
    return render(
      <MemoryRouter initialEntries={[from]}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminBackButton to="/admin/users" />} />
          <Route path="*" element={<Entrance mode={mode} />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('возвращает на дашборд, а не в список пользователей (переход кодом)', () => {
    renderFlow('navigate', '/admin/dashboard');
    fireEvent.click(screen.getByText('открыть'));
    expect(backHref()).toBe('/admin/dashboard');
  });

  it('возвращает в платежи вместе с их страницей (переход ссылкой)', () => {
    renderFlow('link', '/admin/payments?page=3');
    fireEvent.click(screen.getByText('открыть'));
    expect(backHref()).toBe('/admin/payments?page=3');
  });
});
