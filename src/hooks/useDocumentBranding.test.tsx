// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/config/constants';
import { DEFAULT_THEME_COLORS } from '@/types/theme';

/**
 * Владелец бренда в <head> работает без авторизации и на любой странице:
 * посетитель страницы входа раньше видел «VPN»/«Cabinet»/«V» из сборки, потому
 * что заголовок и фавикон ставил только AppShell после логина.
 */

const NO_LOGO = { name: 'ZeroPing', logo_url: null, logo_letter: 'Z', has_custom_logo: false };
const WITH_LOGO = {
  name: 'ZeroPing',
  logo_url: '/cabinet/branding/logo',
  logo_letter: 'Z',
  has_custom_logo: true,
};

const backend = vi.hoisted(() => ({
  branding: {
    name: 'ZeroPing',
    logo_url: null as string | null,
    logo_letter: 'Z',
    has_custom_logo: false,
  },
  blobUrl: null as string | null,
}));

vi.mock('@/api/branding', () => ({
  brandingApi: { getBranding: () => Promise.resolve(backend.branding) },
  getCachedBranding: () => null,
  setCachedBranding: () => {},
  preloadLogo: () => Promise.resolve(),
  getLogoBlobUrl: () => backend.blobUrl,
}));

vi.mock('@/api/themeColors', () => {
  const getColors = () => Promise.resolve({ ...DEFAULT_THEME_COLORS, accent: '#22c55e' });
  return {
    themeColorsApi: {
      getColors,
      getEnabledThemes: () => Promise.resolve({ dark: true, light: true }),
    },
    themeColorsQueryOptions: () => ({ queryKey: ['theme-colors'], queryFn: getColors }),
  };
});

// jsdom не реализует matchMedia, а useTheme его спрашивает.
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

const STATIC_ICON = '/api/cabinet/branding/favicon';

beforeEach(() => {
  document.head.innerHTML = `<link rel="icon" href="${STATIC_ICON}" />`;
  document.title = 'Cabinet';
  localStorage.clear();
  backend.branding = NO_LOGO;
  backend.blobUrl = null;
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
});

async function renderBranding() {
  const { DocumentBranding } = await import('@/components/DocumentBranding');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DocumentBranding />
    </QueryClientProvider>,
  );
}

describe('DocumentBranding', () => {
  it('ставит заголовок, имя приложения, фавикон и манифест из брендинга', async () => {
    await renderBranding();

    await waitFor(() => expect(document.title).toBe('ZeroPing'));
    expect(document.querySelector('meta[name="application-name"]')?.getAttribute('content')).toBe(
      'ZeroPing',
    );
    expect(
      document.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content'),
    ).toBe('ZeroPing');

    await waitFor(() => {
      const href = document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? '';
      // Монограмма буквы Z в цвете акцента инсталляции, а не статический «V».
      expect(decodeURIComponent(href)).toContain('>Z</text>');
      expect(decodeURIComponent(href)).toContain('fill="#22c55e"');
    });

    const manifestHref = document.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? '';
    const manifest = JSON.parse(
      decodeURIComponent(manifestHref.slice(manifestHref.indexOf(',') + 1)),
    );
    expect(manifest.name).toBe('ZeroPing');
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Подсказка для следующей первой отрисовки записана, но без SVG: Safari
    // ставит иконку из подсказки при загрузке и рисует SVG белой плиткой.
    // Без canvas (jsdom) растровой монограммы нет — подсказка без иконки.
    const hint = JSON.parse(localStorage.getItem(STORAGE_KEYS.BRAND_HINT) ?? 'null');
    expect(hint).toEqual({ name: 'ZeroPing', letter: 'Z' });
  });

  it('с логотипом, но без растровой иконки, оставляет ссылку на бота и подсказку без иконки', async () => {
    // Логотип есть, а скруглить его в PNG не вышло (нет canvas, blob отозван,
    // картинка не загрузилась). Раньше вкладка получала SVG-монограмму, и она же
    // уходила в подсказку — Safari у пользователя с логотипом навсегда оставался
    // с белой плиткой «Z». Лучший запасной вариант — ссылка на эндпоинт бота,
    // который отдаёт сам логотип: её и не трогаем.
    backend.branding = WITH_LOGO;
    backend.blobUrl = 'blob:logo';
    await renderBranding();

    await waitFor(() => expect(document.title).toBe('ZeroPing'));
    await waitFor(() => {
      const hint = JSON.parse(localStorage.getItem(STORAGE_KEYS.BRAND_HINT) ?? 'null');
      expect(hint).toEqual({ name: 'ZeroPing', letter: 'Z' });
    });
    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(STATIC_ICON);
    expect(document.head.innerHTML).not.toContain('svg+xml');
  });
});
