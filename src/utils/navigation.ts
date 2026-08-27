/**
 * Navigation helpers for back-button behavior.
 *
 * The Telegram Mini App (and any deep-link entry) can be opened directly on a
 * nested route — e.g. a bot button that opens `/admin` or `/balance/top-up`.
 * In that case React Router's history stack holds a single entry, so a plain
 * `navigate(-1)` has nothing to go back to and the back button appears dead.
 * These helpers let callers detect that situation and fall back to a sensible
 * parent route instead.
 */

/**
 * Derive a parent route by dropping the last path segment.
 *
 *   /admin/users/123  → /admin/users
 *   /balance/top-up   → /balance
 *   /info             → /
 *   /                 → /
 *
 * Used as the back-button target when there is no in-app history. If the
 * derived path is not a real route the app's catch-all redirects to `/`,
 * so the user is never left stuck.
 */
export function getFallbackParentPath(pathname: string): string {
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const parent = segments.slice(0, -1);
  return parent.length ? '/' + parent.join('/') : '/';
}
