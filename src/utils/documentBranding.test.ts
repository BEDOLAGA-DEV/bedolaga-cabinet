// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '@/config/constants';
import {
  buildWebManifest,
  readBrandHint,
  setAppNameMeta,
  setAppleTouchIcon,
  setDocumentTitle,
  setWebManifest,
  writeBrandHint,
} from './documentBranding';
import { letterFaviconDataUri, setFavicon } from './favicon';

/**
 * <head> под бренд инсталляции: вкладка, ярлыки Android/iOS, манифест и
 * подсказка первой отрисовки. Раньше заголовок и фавикон ставились только после
 * авторизации, а имя приложения для ярлыков не ставилось вовсе — ярлык на
 * Android получал «VPN» из статического index.html.
 */

beforeEach(() => {
  document.head.innerHTML = '<link rel="icon" href="data:image/svg+xml,static" />';
  document.title = 'VPN';
  localStorage.clear();
});

afterEach(() => {
  document.head.innerHTML = '';
});

describe('setFavicon', () => {
  it('заменяет узел <link rel="icon">, а не только href', () => {
    const before = document.querySelector('link[rel="icon"]');
    setFavicon('data:image/png;base64,AAAA');

    const links = document.querySelectorAll('link[rel="icon"]');
    expect(links).toHaveLength(1);
    expect(links[0]).not.toBe(before);
    expect(links[0].getAttribute('href')).toBe('data:image/png;base64,AAAA');
  });

  it('не трогает apple-touch-icon', () => {
    setAppleTouchIcon('data:image/png;base64,TOUCH');
    setFavicon('data:image/png;base64,AAAA');
    expect(document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe(
      'data:image/png;base64,TOUCH',
    );
  });
});

describe('letterFaviconDataUri', () => {
  it('рисует первую букву заглавной и экранирует спецсимволы', () => {
    const uri = letterFaviconDataUri('zero');
    expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
    expect(decodeURIComponent(uri)).toContain('>Z</text>');

    expect(decodeURIComponent(letterFaviconDataUri('<'))).toContain('>&lt;</text>');
  });

  it('красится в переданные цвета', () => {
    const svg = decodeURIComponent(
      letterFaviconDataUri('A', { background: '#123456', foreground: '#ffffff' }),
    );
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('fill="#ffffff"');
  });
});

describe('заголовок и имя приложения', () => {
  it('setDocumentTitle не затирает заголовок, переписанный страницей', () => {
    const applied = setDocumentTitle('ZeroPing', null);
    expect(document.title).toBe('ZeroPing');

    // Лендинг поставил свой SEO-заголовок — новое имя бренда его не сбивает.
    document.title = 'Купить VPN за 99 ₽';
    expect(setDocumentTitle('ZeroPing 2', applied)).toBe(applied);
    expect(document.title).toBe('Купить VPN за 99 ₽');
  });

  it('setAppNameMeta создаёт и обновляет метатеги для ярлыков', () => {
    setAppNameMeta('ZeroPing');
    setAppNameMeta('ZeroPing VPN');
    for (const name of ['application-name', 'apple-mobile-web-app-title']) {
      const metas = document.querySelectorAll(`meta[name="${name}"]`);
      expect(metas).toHaveLength(1);
      expect(metas[0].getAttribute('content')).toBe('ZeroPing VPN');
    }
  });
});

describe('веб-манифест', () => {
  it('строится с абсолютными start_url/scope и данными бренда', () => {
    const manifest = buildWebManifest({
      name: 'ZeroPing',
      icons: [{ src: 'data:image/png;base64,X', sizes: '192x192', type: 'image/png' }],
      themeColor: '#0a0f1a',
      backgroundColor: '#0a0f1a',
    });
    expect(manifest.name).toBe('ZeroPing');
    expect(manifest.short_name).toBe('ZeroPing');
    expect(String(manifest.start_url)).toBe(`${window.location.origin}/`);
    expect(String(manifest.scope)).toBe(`${window.location.origin}/`);
    expect(manifest.display).toBe('standalone');
  });

  it('setWebManifest вешает один <link rel="manifest"> с data: URI', () => {
    const input = {
      name: 'ZeroPing',
      icons: [],
      themeColor: '#0a0f1a',
      backgroundColor: '#0a0f1a',
    };
    setWebManifest(input);
    setWebManifest({ ...input, name: 'ZeroPing VPN' });

    const links = document.querySelectorAll('link[rel="manifest"]');
    expect(links).toHaveLength(1);
    const href = links[0].getAttribute('href') ?? '';
    expect(href.startsWith('data:application/manifest+json,')).toBe(true);
    const parsed = JSON.parse(decodeURIComponent(href.slice(href.indexOf(',') + 1)));
    expect(parsed.name).toBe('ZeroPing VPN');
  });
});

describe('подсказка первой отрисовки', () => {
  it('пишется под ключом STORAGE_KEYS.BRAND_HINT и читается обратно', () => {
    writeBrandHint({ name: 'ZeroPing', letter: 'Z', icon: 'data:image/svg+xml,x' });
    expect(localStorage.getItem(STORAGE_KEYS.BRAND_HINT)).toContain('ZeroPing');
    expect(readBrandHint()).toEqual({
      name: 'ZeroPing',
      letter: 'Z',
      icon: 'data:image/svg+xml,x',
    });
  });

  it('не сохраняет слишком большую иконку и отбрасывает мусор', () => {
    writeBrandHint({
      name: 'ZeroPing',
      letter: 'Z',
      icon: `data:image/png;base64,${'A'.repeat(20_000)}`,
    });
    expect(readBrandHint()).toEqual({ name: 'ZeroPing', letter: 'Z', icon: undefined });

    localStorage.setItem(STORAGE_KEYS.BRAND_HINT, '{"name":42}');
    expect(readBrandHint()).toBeNull();
  });
});
