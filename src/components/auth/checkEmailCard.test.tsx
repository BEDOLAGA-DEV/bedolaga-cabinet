// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ruLocale from '@/locales/ru.json';

/**
 * Экран «Проверьте почту» после регистрации.
 *
 * Он был тупиком: письмо не пришло — и оставалось только «Вернуться ко входу»,
 * где без подтверждения не пускают. Тесты держат три выхода из тупика: куда
 * смотреть, как попросить письмо снова и как исправить опечатку в адресе.
 *
 * Пауза перед повтором проверяется как поведение, а не как число: кнопка не
 * должна быть нажимаемой сразу после того, как письмо только что ушло.
 */

function ru(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  if (typeof value !== 'string') throw new Error(`нет строки ${key}`);
  return value;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      ru(key).replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name] ?? '')),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
}));

const resend = vi.fn();

vi.mock('@/api/auth', () => ({
  authApi: {
    resendVerificationPublic: (email: string) => resend(email),
  },
}));

const { CheckEmailCard } = await import('./CheckEmailCard');

function renderCard(overrides: Partial<Parameters<typeof CheckEmailCard>[0]> = {}) {
  const props = {
    email: 'ivan@example.org',
    onBackToLogin: vi.fn(),
    onChangeEmail: vi.fn(),
    ...overrides,
  };
  render(<CheckEmailCard {...props} />);
  return props;
}

/** Промотать паузу перед повторной отправкой. */
function waitOutCooldown() {
  vi.advanceTimersByTime(61_000);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resend.mockReset();
  resend.mockResolvedValue({ message: 'ok' });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('экран «Проверьте почту»', () => {
  it('подсказывает, где искать письмо', () => {
    renderCard();
    expect(screen.getByText(ru('auth.spamHint'))).toBeTruthy();
  });

  it('называет адрес, на который ушло письмо', () => {
    renderCard();
    expect(screen.getByText('ivan@example.org')).toBeTruthy();
  });

  it('сначала не даёт нажать повтор — письмо только что ушло', () => {
    renderCard();
    const button = screen.getByRole('button', { name: /отправить ещё раз через/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(button);
    expect(resend).not.toHaveBeenCalled();
  });

  it('через минуту отправляет письмо ещё раз', async () => {
    renderCard();
    waitOutCooldown();

    const button = await screen.findByRole('button', { name: ru('auth.resendVerification') });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);

    await waitFor(() => expect(resend).toHaveBeenCalledWith('ivan@example.org'));
    expect(await screen.findByText(ru('auth.resendSent'))).toBeTruthy();
  });

  it('после отправки снова ждёт минуту', async () => {
    renderCard();
    waitOutCooldown();
    fireEvent.click(await screen.findByRole('button', { name: ru('auth.resendVerification') }));

    await waitFor(() => expect(resend).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: ru('auth.resendVerification') })).toBeNull();
  });

  it('на слишком частые попытки отвечает по-человечески, а не кодом', async () => {
    const rateLimited = Object.assign(new Error('429'), {
      isAxiosError: true,
      response: { status: 429, data: { detail: 'Too many requests' } },
    });
    resend.mockRejectedValueOnce(rateLimited);

    renderCard();
    waitOutCooldown();
    fireEvent.click(await screen.findByRole('button', { name: ru('auth.resendVerification') }));

    expect(await screen.findByText(ru('auth.resendTooOften'))).toBeTruthy();
    expect(screen.queryByText(/429|Too many requests/)).toBeNull();
  });

  it('на прочий отказ говорит, что письмо не ушло', async () => {
    resend.mockRejectedValueOnce(new Error('boom'));

    renderCard();
    waitOutCooldown();
    fireEvent.click(await screen.findByRole('button', { name: ru('auth.resendVerification') }));

    expect(await screen.findByText(ru('auth.resendError'))).toBeTruthy();
  });

  it('даёт вернуться к регистрации с другим адресом', () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole('button', { name: ru('auth.useAnotherEmail') }));
    expect(props.onChangeEmail).toHaveBeenCalledTimes(1);
  });

  it('даёт вернуться ко входу', () => {
    const props = renderCard();
    fireEvent.click(screen.getByRole('button', { name: ru('auth.backToLogin') }));
    expect(props.onBackToLogin).toHaveBeenCalledTimes(1);
  });
});
