// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_DOCUMENTS, consentRequiredError } from '../test/consentRequiredError';

/**
 * Вход через Telegram Login Widget (редирект на /auth/telegram/callback) для
 * НОВОГО пользователя: бэк отвечает 428 с объектом в detail. Раньше объект
 * попадал прямо в текст ошибки и ронял всё дерево («Something went wrong»,
 * React #31) — новый пользователь не мог войти через Telegram из веба вообще.
 * Ожидание: чекбоксы согласия, затем повтор того же входа с галочками.
 */

// `t` обязана быть стабильной между рендерами, как у настоящего i18next: она в
// зависимостях эффекта страницы, и новая функция на каждый рендер повторяла бы вход.
const { loginWithTelegramWidget, navigate, translation } = vi.hoisted(() => ({
  loginWithTelegramWidget: vi.fn(),
  navigate: vi.fn(),
  translation: {
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => translation,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

vi.mock('../store/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ loginWithTelegramWidget, isAuthenticated: false }),
}));

async function renderCallback() {
  const { default: TelegramCallback } = await import('./TelegramCallback');
  return render(
    <MemoryRouter
      initialEntries={['/auth/telegram/callback?id=1&first_name=A&auth_date=1700000000&hash=h']}
    >
      <Routes>
        <Route path="/auth/telegram/callback" element={<TelegramCallback />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  loginWithTelegramWidget.mockReset();
  navigate.mockReset();
});

afterEach(() => cleanup());

describe('TelegramCallback: 428 «нужно согласие»', () => {
  it('показывает чекбоксы вместо падения и повторяет вход с галочками', async () => {
    loginWithTelegramWidget
      .mockRejectedValueOnce(consentRequiredError())
      .mockResolvedValueOnce(undefined);

    await renderCallback();

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes).toHaveLength(CONSENT_DOCUMENTS.length);
    expect(screen.getByText('Публичная оферта')).toBeTruthy();

    const submit = screen.getByRole('button', { name: 'Продолжить' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    for (const checkbox of checkboxes) fireEvent.click(checkbox);
    expect((submit as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      fireEvent.click(submit);
    });

    await waitFor(() => expect(loginWithTelegramWidget).toHaveBeenCalledTimes(2));
    const [data, accepted] = loginWithTelegramWidget.mock.calls[1];
    expect(data).toMatchObject({ id: 1, first_name: 'A', auth_date: 1700000000, hash: 'h' });
    expect(accepted).toEqual(CONSENT_DOCUMENTS);
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('обычную ошибку показывает текстом, а не объектом', async () => {
    loginWithTelegramWidget.mockRejectedValueOnce(consentRequiredError());
    // Второй запрос (после галочек) падает уже обычной строкой.
    loginWithTelegramWidget.mockRejectedValueOnce(
      Object.assign(new Error('boom'), {
        isAxiosError: true,
        response: {
          status: 401,
          data: { detail: 'This Telegram authorization has already been used.' },
        },
      }),
    );

    await renderCallback();
    for (const checkbox of await screen.findAllByRole('checkbox')) fireEvent.click(checkbox);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    });

    expect(
      await screen.findByText('This Telegram authorization has already been used.'),
    ).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });
});
