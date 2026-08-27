// @vitest-environment node
/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const retrieveRawInitData = vi.fn<() => string | undefined>();

vi.mock('@telegram-apps/sdk-react', () => ({
  retrieveRawInitData: () => retrieveRawInitData(),
}));

const { getTelegramInitData } = await import('./telegramInitData');

/** initData ровно той формы, что приходит от Telegram. */
function initData(authDate: number): string {
  const user = encodeURIComponent(JSON.stringify({ id: 1, first_name: 'A' }));
  return `user=${user}&auth_date=${authDate}&signature=s&hash=h${authDate}`;
}

const OLD = initData(1_700_000_000);
const FRESH = initData(1_755_000_000);

function setBridge(value: string | undefined): void {
  vi.stubGlobal('window', value === undefined ? {} : { Telegram: { WebApp: { initData: value } } });
}

beforeEach(() => {
  retrieveRawInitData.mockReset();
  setBridge(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getTelegramInitData', () => {
  it('uses the Telegram bridge value', () => {
    setBridge(FRESH);
    retrieveRawInitData.mockReturnValue(undefined);

    expect(getTelegramInitData()).toBe(FRESH);
  });

  it('falls back to the SDK when the bridge script has not loaded', () => {
    setBridge(undefined);
    retrieveRawInitData.mockReturnValue(FRESH);

    expect(getTelegramInitData()).toBe(FRESH);
  });

  // Ради этого правка и делается: SDK берёт параметры запуска из записи о
  // навигации и из своего кэша в sessionStorage, а оба привязаны к документу,
  // а не к текущему запуску мини-аппы. На iOS WebView переживает переоткрытия,
  // и SDK молча отдаёт initData прошлой недели — бэкенд её отвергает.
  it('prefers the bridge when the SDK serves a stale cached launch', () => {
    setBridge(FRESH);
    retrieveRawInitData.mockReturnValue(OLD);

    expect(getTelegramInitData()).toBe(FRESH);
  });

  // Обратный случай встречается на других платформах, поэтому выбираем не
  // «первый доступный», а самый свежий по auth_date.
  it('prefers the SDK when the bridge itself is the stale one', () => {
    setBridge(OLD);
    retrieveRawInitData.mockReturnValue(FRESH);

    expect(getTelegramInitData()).toBe(FRESH);
  });

  it('keeps the bridge value when both are equally fresh', () => {
    const bridgeCopy = `${FRESH}&tgWebAppBotInline=0`;
    setBridge(bridgeCopy);
    retrieveRawInitData.mockReturnValue(FRESH);

    expect(getTelegramInitData()).toBe(bridgeCopy);
  });

  it('treats an empty bridge value as absent', () => {
    setBridge('');
    retrieveRawInitData.mockReturnValue(FRESH);

    expect(getTelegramInitData()).toBe(FRESH);
  });

  it('survives the SDK throwing outside Telegram', () => {
    setBridge(FRESH);
    retrieveRawInitData.mockImplementation(() => {
      throw new Error('LaunchParamsRetrieveError');
    });

    expect(getTelegramInitData()).toBe(FRESH);
  });

  it('returns null when there is no init data at all', () => {
    setBridge(undefined);
    retrieveRawInitData.mockImplementation(() => {
      throw new Error('LaunchParamsRetrieveError');
    });

    expect(getTelegramInitData()).toBeNull();
  });

  it('does not crash on init data without a usable auth_date', () => {
    setBridge('user=%7B%7D&hash=h');
    retrieveRawInitData.mockReturnValue('auth_date=not-a-number&hash=h');

    expect(getTelegramInitData()).toBe('user=%7B%7D&hash=h');
  });
});

// Смысл правки — единственная точка чтения initData. Прямой вызов
// retrieveRawInitData() в обход неё вернёт ту самую протухшую копию из кэша
// SDK, причём молча: ошибки не будет, вход просто перестанет работать.
describe('single source of init data', () => {
  it('is read through this module only', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');

    const srcDir = new URL('..', import.meta.url).pathname;
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        if (full.endsWith(join('utils', 'telegramInitData.ts'))) continue;
        if (full.endsWith(join('utils', 'telegramInitData.test.ts'))) continue;
        if (readFileSync(full, 'utf8').includes('retrieveRawInitData')) {
          offenders.push(full.slice(srcDir.length));
        }
      }
    };
    walk(srcDir);

    expect(offenders).toEqual([]);
  });
});
