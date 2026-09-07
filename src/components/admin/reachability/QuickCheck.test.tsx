// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes, useLocation } from 'react-router';

/**
 * Первое, что видно на странице флота: поле «IP, домен, vless:// или ссылка на подписку».
 * Ввод уводит на экран одиночных проверок с нужной вкладкой и подставленным значением.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { QuickCheck } from './QuickCheck';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

function Probe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderQuick() {
  renderWithProviders(
    <Routes>
      <Route path="/admin/reachability" element={<QuickCheck />} />
      <Route path="/admin/reachability/other" element={<Probe />} />
    </Routes>,
  );
}

describe('QuickCheck', () => {
  it('пустое поле никуда не ведёт, кнопка выключена', () => {
    renderQuick();
    expect((screen.getByRole('button', { name: 'Проверить' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('ссылка подписки открывает вкладку «Подписка» с подставленным значением', () => {
    renderQuick();
    fireEvent.change(screen.getByRole('textbox', { name: 'Проверить адрес или подписку' }), {
      target: { value: 'https://sub.example/abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }));
    expect(screen.getByTestId('location').textContent).toBe(
      '/admin/reachability/other?kind=vless&q=https%3A%2F%2Fsub.example%2Fabc',
    );
  });

  it('домен уходит на вкладку «IP / домен» по Enter', () => {
    renderQuick();
    const input = screen.getByRole('textbox', { name: 'Проверить адрес или подписку' });
    fireEvent.change(input, { target: { value: ' ya.ru ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(screen.getByTestId('location').textContent).toBe(
      '/admin/reachability/other?kind=ip&q=ya.ru',
    );
  });

  it('под полем — ссылки на скан подсети и историю', () => {
    renderQuick();
    expect(screen.getByRole('link', { name: 'Скан подсети /24' }).getAttribute('href')).toBe(
      '/admin/reachability/other?kind=cidr',
    );
    expect(screen.getByRole('link', { name: 'История проверок' }).getAttribute('href')).toBe(
      '/admin/reachability/history',
    );
  });
});
