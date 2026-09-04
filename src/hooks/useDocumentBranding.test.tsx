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

vi.mock('@/api/branding', () => ({
  brandingApi: {
    getBranding: () =>
      Promise.resolve({
        name: 'ZeroPing',
        logo_url: null,
        logo_letter: 'Z',
        has_custom_logo: false,
      }),
  },
  getCachedBranding: () => null,
  setCachedBranding: () => {},
  preloadLogo: () => Promise.resolve(),
  getLogoBlobUrl: () => null,
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

beforeEach(() => {
  document.head.innerHTML = '<link rel="icon" href="data:image/svg+xml,static" />';
  document.title = 'Cabinet';
  localStorage.clear();
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

    // Подсказка для следующей первой отрисовки записана.
    const hint = JSON.parse(localStorage.getItem(STORAGE_KEYS.BRAND_HINT) ?? 'null');
    expect(hint).toMatchObject({ name: 'ZeroPing', letter: 'Z' });
    expect(String(hint.icon)).toContain('data:image/svg+xml');
  });
});
