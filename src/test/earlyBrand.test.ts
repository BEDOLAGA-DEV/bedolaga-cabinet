// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import htmlSource from '../../index.html?raw';
import { renderBrandingHtml } from '../../vite-plugins/brandingHtml';
import { monogramDataUri } from '../../vite-plugins/brandMonogram';
import { BRAND_READY_ATTR } from '../utils/documentBranding';

/**
 * Инлайн-скрипт index.html подтягивает бренд с API до загрузки бандла.
 *
 * Готовый образ собран с «Cabinet» и «V», и у рекомендуемой установки (статика
 * из образа за своим Caddy/Nginx) нет никакого рантайма, где это можно было бы
 * поправить. Единственное, что есть у каждой установки одинаково, — сама
 * страница и прокси на API бота. Тест гоняет настоящий скрипт из index.html
 * в jsdom с подменённым fetch и сверяет монограмму с vite-плагином: у SVG две
 * копии (TS для сборки/React и JS в разметке), разъехаться им нельзя.
 */

const BUILT_ICON = 'data:image/svg+xml,built';
const API = '/api';

const SCRIPT = (() => {
  const html = renderBrandingHtml(htmlSource, { name: 'Cabinet', logo: 'V', apiUrl: API });
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const early = scripts.find((s) => s.includes('/cabinet/branding'));
  if (!early) throw new Error('в index.html нет инлайн-скрипта раннего бренда');
  return early;
})();

interface Branding {
  name: string;
  logo_url: string | null;
  logo_letter: string;
  has_custom_logo: boolean;
}

const MONOGRAM_BRAND: Branding = {
  name: 'ZeroPing',
  logo_url: null,
  logo_letter: 'Z',
  has_custom_logo: false,
};

function fetchReturning(branding: Branding | null, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => branding }));
}

function runScript(): void {
  new Function(SCRIPT)();
}

async function settle(): Promise<void> {
  // Два .then после fetch — пары тиков макрозадачи хватает с запасом.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function iconHref(): string | null {
  return document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? null;
}

function metaContent(name: string): string | null {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;
}

beforeEach(() => {
  document.head.innerHTML = [
    `<link rel="icon" href="${BUILT_ICON}" />`,
    '<title>Cabinet</title>',
    '<meta name="application-name" content="Cabinet" />',
    '<meta name="apple-mobile-web-app-title" content="Cabinet" />',
  ].join('');
  document.title = 'Cabinet';
  document.documentElement.removeAttribute(BRAND_READY_ATTR);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ранний бренд из index.html', () => {
  it('на первом заходе берёт имя и монограмму с API, не дожидаясь React', async () => {
    const fetch = fetchReturning(MONOGRAM_BRAND);
    vi.stubGlobal('fetch', fetch);

    runScript();
    await settle();

    expect(fetch).toHaveBeenCalledWith(`${API}/cabinet/branding`, { credentials: 'omit' });
    expect(document.title).toBe('ZeroPing');
    expect(metaContent('application-name')).toBe('ZeroPing');
    expect(metaContent('apple-mobile-web-app-title')).toBe('ZeroPing');
    expect(iconHref()).toBe(monogramDataUri('Z'));
  });

  it('с кастомным логотипом ставит фавиконом сам логотип с API', async () => {
    vi.stubGlobal(
      'fetch',
      fetchReturning({
        name: 'ZeroPing',
        logo_url: '/cabinet/branding/logo',
        logo_letter: 'Z',
        has_custom_logo: true,
      }),
    );

    runScript();
    await settle();

    expect(iconHref()).toBe(`${API}/cabinet/branding/logo`);
  });

  it('запоминает имя и букву, чтобы следующий заход не ждал даже API', async () => {
    vi.stubGlobal('fetch', fetchReturning(MONOGRAM_BRAND));

    runScript();
    await settle();

    expect(JSON.parse(localStorage.getItem('cabinet-brand-hint') ?? 'null')).toEqual({
      name: 'ZeroPing',
      letter: 'Z',
    });
  });

  it('подсказку прошлого визита применяет синхронно и не затирает её без иконки', async () => {
    const icon = 'data:image/png;base64,hint';
    localStorage.setItem(
      'cabinet-brand-hint',
      JSON.stringify({ name: 'ZeroPing', letter: 'Z', icon }),
    );
    vi.stubGlobal('fetch', fetchReturning({ ...MONOGRAM_BRAND, name: 'ZeroPing VPN' }));

    runScript();
    expect(document.title).toBe('ZeroPing');
    expect(iconHref()).toBe(icon);

    await settle();
    expect(document.title).toBe('ZeroPing VPN');
    expect(JSON.parse(localStorage.getItem('cabinet-brand-hint') ?? 'null').icon).toBe(icon);
  });

  it('если React уже применил бренд, поздний ответ API ничего не трогает', async () => {
    let resolve: (value: unknown) => void = () => {};
    const response = new Promise((r) => {
      resolve = r;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => response),
    );

    runScript();
    document.title = 'ZeroPing';
    document.querySelector('link[rel="icon"]')?.setAttribute('href', 'data:image/png;base64,react');
    document.documentElement.setAttribute(BRAND_READY_ATTR, '1');
    resolve({ ok: true, json: async () => ({ ...MONOGRAM_BRAND, name: 'Late' }) });
    await settle();

    expect(document.title).toBe('ZeroPing');
    expect(iconHref()).toBe('data:image/png;base64,react');
  });

  it('при недоступном API остаются значения сборки и ничего не падает', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );

    runScript();
    await settle();

    expect(document.title).toBe('Cabinet');
    expect(iconHref()).toBe(BUILT_ICON);
    expect(localStorage.getItem('cabinet-brand-hint')).toBeNull();
  });

  it('ответ не 200 тоже оставляет значения сборки', async () => {
    vi.stubGlobal('fetch', fetchReturning(null, false));

    runScript();
    await settle();

    expect(document.title).toBe('Cabinet');
    expect(iconHref()).toBe(BUILT_ICON);
  });
});
