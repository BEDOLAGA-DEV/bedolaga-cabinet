import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { consumeCampaignSlug, getPendingCampaignSlug } from './campaign';

const CAMPAIGN_KEY = 'campaign_slug';
const CAMPAIGN_TTL_KEY = 'campaign_slug_ttl';
const HOUR = 60 * 60 * 1000;

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

function storeSlug(slug: string, expiresInMs = 24 * HOUR): void {
  localStorage.setItem(CAMPAIGN_KEY, slug);
  localStorage.setItem(CAMPAIGN_TTL_KEY, String(Date.now() + expiresInMs));
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPendingCampaignSlug', () => {
  it('returns the stored slug', () => {
    storeSlug('summer_sale');

    expect(getPendingCampaignSlug()).toBe('summer_sale');
  });

  // Гостевая покупка на лендинге читает слаг этим геттером. Если он начнёт
  // очищать хранилище, тот же клиент, зайдя потом в кабинет, потеряет
  // привязку к кампании — auth-флоу уже ничего не найдёт.
  it('does not consume the slug', () => {
    storeSlug('summer_sale');

    getPendingCampaignSlug();

    expect(getPendingCampaignSlug()).toBe('summer_sale');
    expect(localStorage.getItem(CAMPAIGN_KEY)).toBe('summer_sale');
  });

  it('drops an expired slug', () => {
    storeSlug('summer_sale', -HOUR);

    expect(getPendingCampaignSlug()).toBeNull();
    expect(localStorage.getItem(CAMPAIGN_TTL_KEY)).toBeNull();
  });

  it('returns null when nothing was captured', () => {
    expect(getPendingCampaignSlug()).toBeNull();
  });
});

describe('consumeCampaignSlug', () => {
  it('clears the slug after reading it once', () => {
    storeSlug('summer_sale');

    expect(consumeCampaignSlug()).toBe('summer_sale');
    expect(consumeCampaignSlug()).toBeNull();
  });
});

// Компоненты в этом репозитории не рендерятся в тестах (vitest на node, без
// jsdom), поэтому отправку слага фиксируем по исходнику: без неё покупка
// гостем не попадает в статистику кампании и не даёт её бонус.
describe('QuickPurchase source', () => {
  const source = readFileSync(new URL('../pages/QuickPurchase.tsx', import.meta.url), 'utf8');

  it('puts the campaign slug into the purchase payload', () => {
    expect(source).toContain('data.campaign_slug = campaignSlug');
  });

  it('reads the slug without consuming it', () => {
    expect(source).toContain('getPendingCampaignSlug()');
    expect(source).not.toContain('consumeCampaignSlug');
  });
});
