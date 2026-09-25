// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import htmlSource from '../../index.html?raw';
import { renderBrandingHtml } from '../../vite-plugins/brandingHtml';
import { BRAND_READY_ATTR } from '../utils/documentBranding';

/**
 * Инлайн-скрипт index.html подтягивает имя бренда с API до загрузки бандла.
 *
 * Готовый образ собран с «Cabinet», и у рекомендуемой установки (статика из
 * образа за своим Caddy/Nginx) нет никакого рантайма, где это можно было бы
 * поправить. Единственное, что есть у каждой установки одинаково, — сама
 * страница и прокси на API бота. Тест гоняет настоящий скрипт из index.html
 * в jsdom с подменённым fetch.
 *
 * Фавикон скрипт не трогает: статическая ссылка ведёт на эндпоинт бота (Safari
 * читает её только при загрузке), а адрес логотипа ему давать нельзя — запрос
 * иконки без Origin кладёт в кеш ответ без CORS-заголовков, и fetch() логотипа
 * из React падает. Единственное исключение — подсказка прошлого визита: это
 * data: URI, сети в нём нет.
 */

const STATIC_ICON = '/api/cabinet/branding/favicon';
const API = '/api';

const SCRIPT = (() => {
  const html = renderBrandingHtml(htmlSource, { name: 'Cabinet', apiUrl: API });
  // Разбор настоящим парсером, а не регуляркой: index.html — документ, и
  // инлайн-скрипты берём из DOM, как это сделал бы браузер.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const scripts = [...doc.querySelectorAll('script:not([src])')].map((s) => s.textContent ?? '');
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

const LOGO_BRAND: Branding = {
  name: 'ZeroPing',
  logo_url: '/cabinet/branding/logo',
  logo_letter: 'Z',
  has_custom_logo: true,
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
    `<link rel="icon" href="${STATIC_ICON}" />`,
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
  it('на первом заходе берёт имя с API, не дожидаясь React', async () => {
    const fetch = fetchReturning(LOGO_BRAND);
    vi.stubGlobal('fetch', fetch);

    runScript();
    await settle();

    expect(fetch).toHaveBeenCalledWith(`${API}/cabinet/branding`, { credentials: 'omit' });
    expect(document.title).toBe('ZeroPing');
    expect(metaContent('application-name')).toBe('ZeroPing');
    expect(metaContent('apple-mobile-web-app-title')).toBe('ZeroPing');
  });

  it('фавикон по ответу API не трогает: ссылка на эндпоинт бота остаётся как есть', async () => {
    vi.stubGlobal('fetch', fetchReturning(LOGO_BRAND));

    runScript();
    await settle();

    expect(iconHref()).toBe(STATIC_ICON);
    expect(document.head.innerHTML).not.toContain('/cabinet/branding/logo');
  });

  it('запоминает имя и букву, чтобы следующий заход не ждал даже API', async () => {
    vi.stubGlobal('fetch', fetchReturning(LOGO_BRAND));

    runScript();
    await settle();

    expect(JSON.parse(localStorage.getItem('cabinet-brand-hint') ?? 'null')).toEqual({
      name: 'ZeroPing',
      letter: 'Z',
    });
  });

  it('подсказку прошлого визита применяет синхронно, включая PNG-иконку', async () => {
    const icon = 'data:image/png;base64,hint';
    localStorage.setItem(
      'cabinet-brand-hint',
      JSON.stringify({ name: 'ZeroPing', letter: 'Z', icon }),
    );
    vi.stubGlobal('fetch', fetchReturning({ ...LOGO_BRAND, name: 'ZeroPing VPN' }));

    runScript();
    expect(document.title).toBe('ZeroPing');
    expect(iconHref()).toBe(icon);

    await settle();
    expect(document.title).toBe('ZeroPing VPN');
    expect(iconHref()).toBe(icon);
    expect(JSON.parse(localStorage.getItem('cabinet-brand-hint') ?? 'null').icon).toBe(icon);
  });

  it('SVG-иконку из подсказки не применяет: ссылка на эндпоинт бота остаётся', () => {
    // Safari рисует SVG-фавикон монохромной плиткой с буквой, а иконку берёт
    // только при загрузке страницы. Подменив ссылку на SVG, скрипт лишал Safari
    // логотипа навсегда: до эндпоинта бота он уже не доходил.
    localStorage.setItem(
      'cabinet-brand-hint',
      JSON.stringify({ name: 'ZeroPing', letter: 'Z', icon: 'data:image/svg+xml,%3Csvg%3E' }),
    );
    vi.stubGlobal('fetch', fetchReturning(LOGO_BRAND));

    runScript();

    expect(document.title).toBe('ZeroPing');
    expect(iconHref()).toBe(STATIC_ICON);
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
    document.documentElement.setAttribute(BRAND_READY_ATTR, '1');
    resolve({ ok: true, json: async () => ({ ...LOGO_BRAND, name: 'Late' }) });
    await settle();

    expect(document.title).toBe('ZeroPing');
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
    expect(iconHref()).toBe(STATIC_ICON);
    expect(localStorage.getItem('cabinet-brand-hint')).toBeNull();
  });

  it('ответ не 200 тоже оставляет значения сборки', async () => {
    vi.stubGlobal('fetch', fetchReturning(null, false));

    runScript();
    await settle();

    expect(document.title).toBe('Cabinet');
    expect(iconHref()).toBe(STATIC_ICON);
  });
});
