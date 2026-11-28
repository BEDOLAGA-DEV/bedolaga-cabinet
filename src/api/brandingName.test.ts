import { beforeEach, describe, expect, it } from 'vitest';
import { getCachedBranding, normalizeBranding, setCachedBranding } from './branding';

const base = { logo_url: null, logo_letter: 'B', has_custom_logo: false };

describe('normalizeBranding', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('разводит имя на чистое и с метками цвета', () => {
    const result = normalizeBranding({ ...base, name: 'berlin{#FF8A00}connection' });
    expect(result.name).toBe('berlinconnection');
    expect(result.name_markup).toBe('berlin{#FF8A00}connection');
  });

  it('имя без меток остаётся как есть', () => {
    const result = normalizeBranding({ ...base, name: 'ZeroPing' });
    expect(result.name).toBe('ZeroPing');
    expect(result.name_markup).toBe('ZeroPing');
  });

  it('повторный вызов ничего не портит', () => {
    const once = normalizeBranding({ ...base, name: 'a{#fff}b' });
    expect(normalizeBranding(once)).toEqual(once);
  });

  it('кеш прошлой сборки без name_markup читается с чистым именем', () => {
    sessionStorage.setItem('cabinet_branding', JSON.stringify({ ...base, name: 'a{#fff}b' }));
    const cached = getCachedBranding();
    expect(cached?.name).toBe('ab');
    expect(cached?.name_markup).toBe('a{#fff}b');
  });

  it('кеш, записанный текущей сборкой, переживает круг записи и чтения', () => {
    setCachedBranding(normalizeBranding({ ...base, name: 'berlin{#FF8A00}connection' }));
    const cached = getCachedBranding();
    expect(cached?.name).toBe('berlinconnection');
    expect(cached?.name_markup).toBe('berlin{#FF8A00}connection');
  });
});
