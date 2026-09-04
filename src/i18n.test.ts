// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import htmlSource from '../index.html?raw';
import mainSource from './main.tsx?raw';

/**
 * На холодном кэше интерфейс успевал отрисоваться раньше словарей, и на экране
 * оставались сырые ключи: `auth.login`, `auth.email`, `common.or`. Ключи с
 * инлайн-дефолтом — `t('auth.register', 'Register')` — при этом рисовались
 * по-английски, отчего форма выглядела наполовину переведённой.
 *
 * Причина: локали разнесены по ленивым чанкам (`import('./locales/ru.json')`,
 * ~75 КБ gzip), `react.useSuspense` выключен, а `main.tsx` звал
 * `createRoot().render()`, не дожидаясь загрузки. С прогретым кэшем чанк
 * приходил за ~0 мс и успевал к первой отрисовке — отсюда «с некоторой
 * вероятностью».
 *
 * Здесь держится контракт: модуль i18n отдаёт промис готовности, и точка
 * входа рисует приложение только после него.
 */

describe('готовность словарей', () => {
  it('после i18nReady активный язык переведён, а не отдаёт ключи', async () => {
    const { default: i18n, i18nReady } = await import('./i18n');

    await i18nReady;

    expect(i18n.hasResourceBundle('ru', 'translation')).toBe(true);
    // Ключи с картинки из репорта.
    for (const key of ['auth.login', 'auth.email', 'auth.password', 'common.or']) {
      expect(i18n.t(key)).not.toBe(key);
    }
  });

  it('i18nReady не отваливается, даже если словарь не загрузился', async () => {
    // Промис готовности не должен ронять точку входа: белый экран хуже
    // непереведённого. Проверяем, что он именно резолвится, а не реджектится.
    const { i18nReady } = await import('./i18n');
    await expect(i18nReady).resolves.toBeUndefined();
  });
});

describe('точка входа', () => {
  it('рисует приложение только после i18nReady', () => {
    expect(mainSource).toMatch(/i18nReady/);

    const readyAt = mainSource.indexOf('i18nReady');
    const renderAt = mainSource.indexOf('createRoot');
    expect(readyAt).toBeGreaterThan(-1);
    expect(readyAt).toBeLessThan(renderAt);
  });
});

describe('тема до первой отрисовки', () => {
  it('index.html применяет сохранённую тему инлайн-скриптом', () => {
    // Тему вешает useTheme в useEffect, то есть уже ПОСЛЕ первой отрисовки,
    // а в index.html зашиты class="dark" и тёмный фон. Пользователь светлой
    // темы поэтому видит тёмную вспышку — тем заметнее, что рендер теперь
    // ждёт словари.
    expect(htmlSource).toMatch(/cabinet-theme/);
  });

  it('ключи хранилища в инлайн-скрипте совпадают с STORAGE_KEYS', async () => {
    const { STORAGE_KEYS } = await import('./config/constants');

    // Переименуют ключ в constants.ts — инлайн-скрипт молча перестанет
    // находить тему, и вспышка вернётся без единой ошибки в консоли.
    expect(htmlSource).toContain(STORAGE_KEYS.THEME);
    expect(htmlSource).toContain(STORAGE_KEYS.ENABLED_THEMES);
    expect(htmlSource).toContain(STORAGE_KEYS.BRAND_HINT);
  });

  it('фон первой отрисовки уступает фону темы из CSS приложения', () => {
    // Инлайн-стиль index.html — только заглушка до прихода CSS приложения.
    // Фон светлой темы там задаёт `.light body` (специфичность 0,1,1) через
    // операторский цвет из applyThemeColors; `@layer base` в Tailwind v3 — не
    // настоящий каскадный слой, так что более специфичный селектор в index.html
    // (`html.light body`, 0,1,2) молча перекрывал бы кастомный фон навсегда.
    const inlineCss = /<style>([\s\S]*?)<\/style>/.exec(htmlSource)?.[1];
    expect(inlineCss).toBeTruthy();

    const root = document.documentElement;
    const inline = document.createElement('style');
    inline.textContent = inlineCss ?? '';
    const app = document.createElement('style');
    app.textContent = '.light body { background-color: rgb(1, 2, 3); }';
    const bodyBg = () => getComputedStyle(document.body).backgroundColor;

    root.className = 'light';
    document.head.append(inline);
    try {
      // До CSS приложения заглушка обязана рисовать светлый фон, не тёмный.
      expect(bodyBg()).toBe('rgb(247, 231, 206)');

      document.head.append(app);
      expect(bodyBg()).toBe('rgb(1, 2, 3)');
    } finally {
      inline.remove();
      app.remove();
      root.className = '';
    }
  });
});
