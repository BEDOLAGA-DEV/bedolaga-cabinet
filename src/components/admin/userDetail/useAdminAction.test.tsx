// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminAction } from './useAdminAction';

const notify = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };

vi.mock('@/platform/hooks/useNotify', () => ({ useNotify: () => notify }));
vi.mock('@/components/admin/users/useMoney', () => ({
  useMoney: () => (rub: number) => `${rub} ₽`,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

/**
 * Действия карточки пользователя: раньше блокировка, синхронизация и начисление
 * глотали ошибку в console.error — админ не видел ни успеха, ни отказа.
 */
describe('useAdminAction', () => {
  beforeEach(() => {
    notify.success.mockClear();
    notify.error.mockClear();
  });

  it('успех — тост и перечитывание', async () => {
    const after = vi.fn();
    const { result } = renderHook(() => useAdminAction());
    let ok = false;
    await act(async () => {
      ok = await result.current.run(async () => ({ success: true }), { success: 'Готово', after });
    });
    expect(ok).toBe(true);
    expect(notify.success).toHaveBeenCalledWith('Готово');
    expect(after).toHaveBeenCalledOnce();
  });

  it('ответ success:false — ошибка с текстом сервера, без перечитывания', async () => {
    const after = vi.fn();
    const { result } = renderHook(() => useAdminAction());
    let ok = true;
    await act(async () => {
      ok = await result.current.run(
        async () => ({ success: false, message: 'Нечего сбрасывать' }),
        {
          after,
        },
      );
    });
    expect(ok).toBe(false);
    expect(notify.error).toHaveBeenCalledWith('Нечего сбрасывать', 'common.error');
    expect(after).not.toHaveBeenCalled();
  });

  it('исключение без текста — общая ошибка', async () => {
    const { result } = renderHook(() => useAdminAction());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error('network');
      });
    });
    expect(notify.error).toHaveBeenCalledWith('admin.users.errors.generic', 'common.error');
  });

  it('второй запуск, пока идёт первый, не отправляется', async () => {
    const { result } = renderHook(() => useAdminAction());
    let release: () => void = () => {};
    const task = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    let second = true;
    await act(async () => {
      const first = result.current.run(task);
      second = await result.current.run(task);
      release();
      await first;
    });
    expect(second).toBe(false);
    expect(task).toHaveBeenCalledOnce();
  });
});
