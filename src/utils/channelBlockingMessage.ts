/**
 * The backend hardcodes this English message in the 403
 * `channel_subscription_required` payload (app/cabinet/dependencies.py). It is
 * not admin-configurable and not localized, so showing it verbatim leaks
 * English into every locale. Treat it as "no custom message" and let the UI
 * fall back to its own i18n string.
 */
const BACKEND_DEFAULT_MESSAGES = new Set(['Please subscribe to the required channels to continue']);

/**
 * Returns the backend-provided channel-subscription message only when it is a
 * real custom message; `null` for empty values and known backend defaults.
 */
export function customChannelMessage(message: string | null | undefined): string | null {
  const trimmed = message?.trim();
  if (!trimmed || BACKEND_DEFAULT_MESSAGES.has(trimmed)) return null;
  return trimmed;
}
