// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Стор авторизации не должен падать, когда хранилище браузера заблокировано.
 *
 * persist у zustand по умолчанию ходит в голый localStorage. Его
 * createJSONStorage ловит только БРОСОК геттера — заблокированное хранилище
 * деградирует штатно. А вот случай «глобала нет» он не проверяет: строит
 * хранилище поверх undefined и роняет TypeError из недр библиотеки на КАЖДЫЙ
 * set(), то есть на любое изменение состояния входа. Так ведёт себя node 25+
 * под jsdom и часть встроенных вебвью. Прикладной safeStorage до библиотеки не
 * дотягивается, пока storage не передан явно, поэтому в persist() он явный.
 *
 * Тест воспроизводит оба отказа сам, поэтому краснеет на любой версии node.
 */

const originals = new Map<string, PropertyDescriptor | undefined>();

function remember(name: string) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
}

/** Хранилище есть, но обращение к нему запрещено (приватный режим, запрет данных). */
function blockStorage(name: 'localStorage' | 'sessionStorage') {
  remember(name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

/** Глобала нет вовсе — именно этот случай дефолт zustand не переживает. */
function removeStorage(name: 'localStorage' | 'sessionStorage') {
  remember(name);
  Object.defineProperty(globalThis, name, { value: undefined, configurable: true, writable: true });
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(async () => {
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete (globalThis as Record<string, unknown>)[name];
  }
  originals.clear();
  const { resetSafeStorage } = await import('../utils/safeStorage');
  resetSafeStorage();
});

describe('useAuthStore при заблокированном хранилище', () => {
  it('импортируется, не бросая на создании persist', async () => {
    blockStorage('localStorage');
    blockStorage('sessionStorage');

    await expect(import('./auth')).resolves.toBeDefined();
  });

  it('переживает setState при заблокированном хранилище', async () => {
    blockStorage('localStorage');
    blockStorage('sessionStorage');
    const { useAuthStore } = await import('./auth');

    expect(() => useAuthStore.setState({ isLoading: false })).not.toThrow();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('переживает setState, когда глобала нет — тут дефолт persist роняет TypeError', async () => {
    removeStorage('localStorage');
    removeStorage('sessionStorage');
    const { useAuthStore } = await import('./auth');

    expect(() => useAuthStore.setState({ isLoading: false })).not.toThrow();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('не поднимает пользователя из пустоты', async () => {
    blockStorage('localStorage');
    blockStorage('sessionStorage');
    const { useAuthStore } = await import('./auth');

    expect(useAuthStore.getState().user).toBeNull();
  });
});
