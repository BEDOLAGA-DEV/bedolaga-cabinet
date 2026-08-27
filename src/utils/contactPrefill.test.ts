// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readContactPrefill, stripContactFromUrl } from './contactPrefill';

const STORAGE_KEY = 'lp_contact_promo';

let replaced: string[] = [];

function fakeLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  } as Storage;
}

function stubLocation(search: string, pathname = '/buy/promo', hash = ''): void {
  vi.stubGlobal('window', {
    location: { search, pathname, hash },
    history: {
      replaceState: (_state: unknown, _title: string, url: string) => replaced.push(url),
    },
  });
}

beforeEach(() => {
  replaced = [];
  vi.stubGlobal('localStorage', fakeLocalStorage());
  stubLocation('');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readContactPrefill', () => {
  it('takes the contact from the URL', () => {
    stubLocation('?contact=client%40example.com');

    expect(readContactPrefill(STORAGE_KEY)).toBe('client@example.com');
  });

  it('keeps the @ of a telegram username', () => {
    stubLocation('?contact=%40durov');

    expect(readContactPrefill(STORAGE_KEY)).toBe('@durov');
  });

  it('prefers the URL over the remembered value', () => {
    localStorage.setItem(STORAGE_KEY, 'old@example.com');
    stubLocation('?contact=new%40example.com');

    expect(readContactPrefill(STORAGE_KEY)).toBe('new@example.com');
  });

  it('falls back to the remembered value', () => {
    localStorage.setItem(STORAGE_KEY, 'old@example.com');

    expect(readContactPrefill(STORAGE_KEY)).toBe('old@example.com');
  });

  it('returns an empty string when there is nothing to prefill', () => {
    expect(readContactPrefill(STORAGE_KEY)).toBe('');
  });
});

describe('stripContactFromUrl', () => {
  // Лендинг поднимает Яндекс.Метрику с webvisor: оставленный в адресе email
  // уедет в аналитику, в Referer при переходе на оплату и в историю браузера.
  it('removes the contact from the address bar', () => {
    stubLocation('?contact=client%40example.com');

    stripContactFromUrl();

    expect(replaced).toEqual(['/buy/promo']);
  });

  it('keeps the other query params', () => {
    stubLocation('?campaign=summer&contact=client%40example.com&subid=42');

    stripContactFromUrl();

    expect(replaced).toHaveLength(1);
    const params = new URLSearchParams(replaced[0].split('?')[1]);
    expect(params.get('campaign')).toBe('summer');
    expect(params.get('subid')).toBe('42');
    expect(params.has('contact')).toBe(false);
  });

  it('keeps the hash', () => {
    stubLocation('?contact=client%40example.com', '/buy/promo', '#tariffs');

    stripContactFromUrl();

    expect(replaced).toEqual(['/buy/promo#tariffs']);
  });

  it('does not touch the URL when there is no contact param', () => {
    stubLocation('?campaign=summer');

    stripContactFromUrl();

    expect(replaced).toEqual([]);
  });
});

// Компоненты здесь не рендерятся (vitest на node, без jsdom), поэтому вызовы
// фиксируем по исходнику: чтение без очистки оставит контакт в адресе, а это
// вся суть второй функции.
describe('QuickPurchase source', () => {
  const source = readFileSync(new URL('../pages/QuickPurchase.tsx', import.meta.url), 'utf8');

  it('prefills the contact field from the URL', () => {
    expect(source).toContain('readContactPrefill(contactKey)');
  });

  it('cleans the contact out of the address bar', () => {
    expect(source).toContain('stripContactFromUrl()');
  });
});
