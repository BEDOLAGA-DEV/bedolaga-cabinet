// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Приложение обязано рендериться, когда хранилище браузера заблокировано.
 *
 * В приватном режиме Safari, при настройке «блокировать данные сайтов» и во
 * встроенных вебвью обращение к localStorage/sessionStorage кидает
 * SecurityError на самом доступе к свойству. Три места читали хранилище в фазе
 * рендера у корня дерева — useTheme (инициализатор useState), useOnboarding (то
 * же) и saveReturnUrl (тело рендера ProtectedRoute перед редиректом). Бросок в
 * любом из них уходил в app-level ErrorBoundary, то есть белый экран на всех
 * маршрутах, включая /login: пользователь не мог даже дойти до входа.
 *
 * Тест форсирует бросок сам, поэтому краснеет на любой версии node, а не только
 * там, где глобал сломан окружением.
 */

vi.mock('../api/themeColors', () => ({
  themeColorsApi: {
    getEnabledThemes: () => new Promise(() => {}),
    getThemeColors: () => new Promise(() => {}),
  },
}));

// jsdom не реализует matchMedia, а тема его спрашивает (как и в остальных
// jsdom-тестах репозитория).
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function blockStorage(name: 'localStorage' | 'sessionStorage') {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

const originals = new Map<string, PropertyDescriptor | undefined>();

beforeEach(async () => {
  for (const name of ['localStorage', 'sessionStorage']) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }
  const { resetSafeStorage } = await import('../utils/safeStorage');
  resetSafeStorage();
});

afterEach(async () => {
  cleanup();
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete (globalThis as Record<string, unknown>)[name];
  }
  const { resetSafeStorage } = await import('../utils/safeStorage');
  resetSafeStorage();
});

describe('useTheme при заблокированном localStorage', () => {
  it('рендерится и отдаёт тему по умолчанию, а не роняет дерево', async () => {
    blockStorage('localStorage');
    const { useTheme } = await import('../hooks/useTheme');

    function Probe() {
      const { theme } = useTheme();
      return <span data-testid="theme">{theme}</span>;
    }

    render(<Probe />);

    expect(['dark', 'light']).toContain(screen.getByTestId('theme').textContent);
  });
});

describe('useOnboarding при заблокированном localStorage', () => {
  it('рендерится и считает онбординг непройденным', async () => {
    blockStorage('localStorage');
    const { useOnboarding } = await import('../components/Onboarding');

    function Probe() {
      const { isCompleted } = useOnboarding();
      return <span data-testid="done">{String(isCompleted)}</span>;
    }

    render(<Probe />);

    expect(screen.getByTestId('done').textContent).toBe('false');
  });

  it('не бросает при завершении онбординга', async () => {
    blockStorage('localStorage');
    const { useOnboarding } = await import('../components/Onboarding');

    let complete: (() => void) | null = null;
    function Probe() {
      const hook = useOnboarding();
      complete = hook.complete;
      return <span data-testid="done">{String(hook.isCompleted)}</span>;
    }

    render(<Probe />);

    expect(() => complete?.()).not.toThrow();
  });
});

describe('saveReturnUrl при заблокированном sessionStorage', () => {
  it('не бросает, чтобы редирект на логин состоялся', async () => {
    blockStorage('sessionStorage');
    const { saveReturnUrl, getAndClearReturnUrl } = await import('../utils/token');

    expect(() => saveReturnUrl()).not.toThrow();
    expect(() => getAndClearReturnUrl()).not.toThrow();
  });
});
