// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../types';

/**
 * Аватар в шапке Mini App показывался серым кругом: единственным источником
 * был photo_url из initData, и при его отсутствии или ошибке загрузки кабинет
 * сдавался. Теперь второй источник — фото профиля от бота, а неудачная картинка
 * уступает место следующей.
 */

const { initDataUser, getMyAvatar } = vi.hoisted(() => ({
  initDataUser: vi.fn(),
  getMyAvatar: vi.fn(),
}));

vi.mock('@telegram-apps/sdk-react', () => ({ initDataUser }));
vi.mock('../api/auth', () => ({ authApi: { getMyAvatar } }));

const telegramUser = { id: 1, telegram_id: 123 } as User;
const emailUser = { id: 2, telegram_id: null } as User;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  initDataUser.mockReset();
  getMyAvatar.mockReset();
});

afterEach(() => cleanup());

describe('useUserAvatar', () => {
  it('сразу показывает фото из initData, не дожидаясь бота', async () => {
    initDataUser.mockReturnValue({ photo_url: 'https://t.me/i/userpic/320/a.jpg' });
    getMyAvatar.mockResolvedValue({ photo_url: 'https://api/cabinet/media/X?token=t' });

    const { result } = renderHook(() => useUserAvatarUnderTest(telegramUser), { wrapper });

    expect(result.current.src).toBe('https://t.me/i/userpic/320/a.jpg');
  });

  it('без photo_url в initData берёт фото у бота', async () => {
    initDataUser.mockReturnValue({});
    getMyAvatar.mockResolvedValue({ photo_url: 'https://api/cabinet/media/X?token=t' });

    const { result } = renderHook(() => useUserAvatarUnderTest(telegramUser), { wrapper });

    await waitFor(() => expect(result.current.src).toBe('https://api/cabinet/media/X?token=t'));
  });

  it('если фото из initData не загрузилось — переходит к фото от бота, потом к заглушке', async () => {
    initDataUser.mockReturnValue({ photo_url: 'https://t.me/i/userpic/320/a.jpg' });
    getMyAvatar.mockResolvedValue({ photo_url: 'https://api/cabinet/media/X?token=t' });

    const { result } = renderHook(() => useUserAvatarUnderTest(telegramUser), { wrapper });
    await waitFor(() => expect(getMyAvatar).toHaveBeenCalled());

    act(() => result.current.onError());
    await waitFor(() => expect(result.current.src).toBe('https://api/cabinet/media/X?token=t'));

    act(() => result.current.onError());
    await waitFor(() => expect(result.current.src).toBeNull());
  });

  it('вне Telegram (initDataUser бросает) не падает и спрашивает бота', async () => {
    initDataUser.mockImplementation(() => {
      throw new Error('not in Telegram');
    });
    getMyAvatar.mockResolvedValue({ photo_url: 'https://api/cabinet/media/X?token=t' });

    const { result } = renderHook(() => useUserAvatarUnderTest(telegramUser), { wrapper });

    await waitFor(() => expect(result.current.src).toBe('https://api/cabinet/media/X?token=t'));
  });

  it('у аккаунта без Telegram бота не спрашивает', () => {
    initDataUser.mockReturnValue(undefined);

    const { result } = renderHook(() => useUserAvatarUnderTest(emailUser), { wrapper });

    expect(result.current.src).toBeNull();
    expect(getMyAvatar).not.toHaveBeenCalled();
  });
});

// Импорт после vi.mock, чтобы хук получил замоканные модули.
const { useUserAvatar: useUserAvatarUnderTest } = await import('./useUserAvatar');
