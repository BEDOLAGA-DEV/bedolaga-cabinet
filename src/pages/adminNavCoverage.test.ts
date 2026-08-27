import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every admin page must be reachable from the admin main menu.
 *
 * The reward-level editor was not: it existed, it was routed, and it could only be
 * found by going through Partners → Settings. An admin who switched the referral
 * scheme on then looked for it in the menu and concluded the feature was missing.
 *
 * The menu is a static list, so nothing fails when a page is left out of it — which
 * is exactly why this check reads both lists and compares them.
 */

const SRC = join(import.meta.dirname, '..');

const appSource = readFileSync(join(SRC, 'App.tsx'), 'utf-8');
const panelSource = readFileSync(join(SRC, 'pages/AdminPanel.tsx'), 'utf-8');

/**
 * A route is a sub-screen when its shape says so, not because someone listed it:
 * anything with a path parameter, and anything ending in an action segment. Those
 * are reached from their own parent. Enumerating them by hand would mean this
 * check needs editing on every new edit-form — and a stale list is how the levels
 * page went missing in the first place.
 */
const SUB_SCREEN_SUFFIXES = [
  '/create',
  '/edit',
  '/stats',
  '/send',
  '/assign',
  '/settings',
  '/reject',
  '/commission',
  '/revoke',
  '/review',
  '/campaigns',
];

function isSubScreen(route: string): boolean {
  if (route.includes(':')) return true;
  return SUB_SCREEN_SUFFIXES.some((suffix) => route.endsWith(suffix));
}

function adminRoutes(): string[] {
  const matches = appSource.matchAll(/path="(\/admin\/[^"]*)"/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

function menuTargets(): string[] {
  const matches = panelSource.matchAll(/to: '(\/admin\/[^']*)'/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

describe('главное меню админки', () => {
  it('содержит страницу уровней реферальных наград', () => {
    expect(menuTargets()).toContain('/admin/partners/referral-levels');
  });

  it('требует для неё то же право, что и маршрут с эндпоинтами', () => {
    // Пункт с более слабым правом привёл бы админа на экран, который сразу
    // падает в ошибку загрузки, — это хуже отсутствующего пункта.
    const entry = panelSource.slice(panelSource.indexOf("'/admin/partners/referral-levels'"));
    expect(entry.slice(0, 200)).toContain("permission: 'partners:settings'");
    expect(appSource).toContain('path="/admin/partners/referral-levels"');
  });

  it('не оставляет админских страниц без входа', () => {
    const inMenu = new Set(menuTargets());
    const orphans = adminRoutes().filter(
      (route) => !inMenu.has(route) && !isSubScreen(route) && route !== '/admin',
    );

    expect(orphans).toEqual([]);
  });
});
