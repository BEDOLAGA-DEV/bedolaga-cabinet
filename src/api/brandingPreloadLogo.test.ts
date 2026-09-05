// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrandingInfo } from './branding';

/**
 * Загрузка логотипа переживает отравленный кеш браузера.
 *
 * URL логотипа мог быть запрошен без Origin — как фавикон или <img> (старые
 * сборки кабинета ставили фавикону именно /cabinet/branding/logo). Ответ без
 * CORS-заголовков ложится в кеш, и fetch() получает из кеша копию без
 * Access-Control-Allow-Origin: браузер отклоняет её как CORS-ошибку, хотя
 * сервер отвечает правильно. Шапка оставалась без логотипа до истечения кеша.
 * Повтор в режиме reload идёт мимо кеша и перезаписывает запись.
 */

const BRANDING: BrandingInfo = {
  name: 'ZeroPing',
  logo_url: '/cabinet/branding/logo',
  logo_letter: 'Z',
  has_custom_logo: true,
};

const CORS_FAILURE = new TypeError('Failed to fetch');

function okResponse(): Response {
  return { ok: true, blob: async () => new Blob(['png']) } as unknown as Response;
}

async function loadModule() {
  vi.resetModules();
  return import('./branding');
}

// jsdom не реализует blob-URL; класс URL при этом нужен целым — он используется
// в зависимостях модуля.
const objectUrl = { createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: vi.fn() };

beforeEach(() => {
  sessionStorage.clear();
  objectUrl.createObjectURL.mockClear();
  objectUrl.revokeObjectURL.mockClear();
  Object.defineProperty(URL, 'createObjectURL', {
    value: objectUrl.createObjectURL,
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: objectUrl.revokeObjectURL,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('preloadLogo', () => {
  it('в здоровом случае один запрос с кешем по умолчанию', async () => {
    const fetch = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetch);
    const { preloadLogo, getLogoBlobUrl } = await loadModule();

    await preloadLogo(BRANDING);

    expect(fetch).toHaveBeenCalledTimes(1);
    // Адрес API в тестах берётся из .env — важен только путь.
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/cabinet\/branding\/logo$/));
    expect(getLogoBlobUrl()).toBe('blob:logo');
  });

  it('после CORS-провала из кеша повторяет запрос мимо кеша и получает логотип', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(CORS_FAILURE).mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetch);
    const { preloadLogo, getLogoBlobUrl } = await loadModule();

    await preloadLogo(BRANDING);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringMatching(/\/cabinet\/branding\/logo$/), {
      cache: 'reload',
    });
    expect(getLogoBlobUrl()).toBe('blob:logo');
  });

  it('параллельные вызовы делят один запрос и один blob, ничего не отзывая', async () => {
    // Логотип просят одновременно запрос брендинга и сборка иконок. Раньше каждый
    // вызов делал свой fetch, а закончивший вторым отзывал blob-адрес первого —
    // прямо под <img> шапки или под canvas фавикона: картинка не грузилась,
    // и вкладка получала монограмму вместо логотипа.
    let release: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetch = vi.fn(() => pending);
    vi.stubGlobal('fetch', fetch);
    const { preloadLogo, getLogoBlobUrl } = await loadModule();

    const first = preloadLogo(BRANDING);
    const second = preloadLogo(BRANDING);
    release(okResponse());
    await Promise.all([first, second]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(objectUrl.createObjectURL).toHaveBeenCalledTimes(1);
    expect(objectUrl.revokeObjectURL).not.toHaveBeenCalled();
    expect(getLogoBlobUrl()).toBe('blob:logo');
  });

  it('повторный вызов после загрузки не ходит в сеть и не трогает blob', async () => {
    const fetch = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetch);
    const { preloadLogo } = await loadModule();

    await preloadLogo(BRANDING);
    await preloadLogo(BRANDING);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(objectUrl.createObjectURL).toHaveBeenCalledTimes(1);
    expect(objectUrl.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('если и повтор упал — тихо остаётся без логотипа', async () => {
    const fetch = vi.fn().mockRejectedValue(CORS_FAILURE);
    vi.stubGlobal('fetch', fetch);
    const { preloadLogo, getLogoBlobUrl } = await loadModule();

    await expect(preloadLogo(BRANDING)).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(getLogoBlobUrl()).toBeNull();
  });
});
