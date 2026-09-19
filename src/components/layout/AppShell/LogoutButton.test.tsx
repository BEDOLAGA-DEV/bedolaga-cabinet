// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Кнопка «Выйти» нужна только в браузере. В Telegram вход идёт по initData:
 * после «выхода» страница входа тут же входит обратно — кнопка бессмысленна и
 * только путает. Оба места (шапка на широком экране и мобильное меню) рисуют
 * её через один компонент, и он в Telegram не рисует ничего.
 */

const state = { telegram: false };

vi.mock('@/platform/hooks/usePlatform', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/platform/hooks/usePlatform')>();
  return { ...original, useIsTelegram: () => state.telegram };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

afterEach(() => {
  cleanup();
  state.telegram = false;
});

async function renderButton(variant: 'menu' | 'icon', onLogout = () => {}) {
  const { LogoutButton } = await import('./LogoutButton');
  return render(<LogoutButton variant={variant} onLogout={onLogout} />);
}

describe('кнопка выхода', () => {
  it('в браузере есть в меню и в шапке и зовёт выход', async () => {
    const calls: number[] = [];
    await renderButton('menu', () => calls.push(1));

    screen.getByText('nav.logout').click();
    expect(calls).toHaveLength(1);

    cleanup();
    await renderButton('icon');
    expect(screen.getByTitle('nav.logout')).toBeTruthy();
  });

  it('в Telegram не рисуется ни в меню, ни в шапке', async () => {
    state.telegram = true;

    const menu = await renderButton('menu');
    expect(menu.container.innerHTML).toBe('');

    cleanup();
    const icon = await renderButton('icon');
    expect(icon.container.innerHTML).toBe('');
  });
});
