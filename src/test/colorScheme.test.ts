import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import htmlSource from '../../index.html?raw';

// Не `?raw`: CSS в vitest проходит через css-плагин и приходит пустой строкой.
const globalsCss = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8');

/**
 * Страница объявляет, что сама ведёт тёмную и светлую темы.
 *
 * Без `color-scheme` Android WebView (в том числе внутри Telegram на Xiaomi с
 * системным «тёмным режимом для приложений») считает страницу не умеющей
 * тёмную тему и затемняет её алгоритмом — по слоям и не за один кадр: цвета
 * «прыгают», уже тёмная палитра оператора уходит в чёрный. Объявление
 * снимает алгоритм; сама схема следует классу темы на <html>, чтобы нативные
 * контролы и скроллбары совпадали с выбранной темой, а не с системной.
 */
describe('color-scheme страницы', () => {
  it('index.html объявляет обе схемы и привязывает их к классу темы до загрузки CSS', () => {
    expect(htmlSource).toMatch(/<meta\s+name="color-scheme"\s+content="dark light"\s*\/?>/);
    expect(htmlSource).toMatch(/html\.dark\s*{\s*color-scheme:\s*dark;?\s*}/);
    expect(htmlSource).toMatch(/html\.light\s*{\s*color-scheme:\s*light;?\s*}/);
  });

  it('globals.css держит схему за классом темы и после загрузки приложения', () => {
    expect(globalsCss).toMatch(/\.dark\s*{\s*color-scheme:\s*dark;?\s*}/);
    expect(globalsCss).toMatch(/\.light\s*{\s*color-scheme:\s*light;?\s*}/);
  });
});
