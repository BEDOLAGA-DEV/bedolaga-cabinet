import type { SupportConfig } from '../types';

export interface ResolvedSupportLink {
  url: string;
  isTelegram: boolean;
}

const ALLOWED_SCHEMES = ['http:', 'https:', 'tg:'];

function isAllowedScheme(url: string): boolean {
  try {
    return ALLOWED_SCHEMES.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * Resolve the support contact into a link the page can open.
 *
 * `SUPPORT_USERNAME` on the backend accepts both `@username` and a bare URL, so the
 * server resolves it for us and reports which flavour it is. Older backends send
 * neither `support_url` nor `contact_is_telegram` — there we keep the previous
 * behaviour and build a `t.me` link out of the username.
 *
 * Returns null when there is nothing safe to open, in which case the caller should
 * render no button at all.
 */
export function resolveSupportLink(
  config:
    | Pick<SupportConfig, 'support_url' | 'support_username' | 'contact_is_telegram'>
    | null
    | undefined,
): ResolvedSupportLink | null {
  if (!config) return null;

  const serverUrl = config.support_url?.trim();

  if (serverUrl) {
    // The URL is admin-supplied; refuse exotic schemes rather than handing
    // `javascript:` straight to the platform opener.
    if (!isAllowedScheme(serverUrl)) return null;

    return { url: serverUrl, isTelegram: config.contact_is_telegram === true };
  }

  const username = config.support_username?.trim();

  if (!username) return null;

  // Legacy path: a bare URL here would produce `t.me/https://…`, so only usernames
  // are accepted — anything URL-shaped is left to the backend to resolve.
  const handle = username.startsWith('@') ? username.slice(1) : username;

  if (!/^[A-Za-z0-9_]{3,}$/.test(handle)) return null;

  return { url: `https://t.me/${handle}`, isTelegram: true };
}
