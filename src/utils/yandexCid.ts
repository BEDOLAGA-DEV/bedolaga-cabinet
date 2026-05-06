/**
 * Yandex Metrika ClientID helpers.
 *
 * Lives in `utils/` (not `hooks/`) so that both the `api/` layer
 * (auth.ts, oauth.ts) and React hooks can read the cached CID
 * without `api/` accidentally importing from `hooks/`.
 */

const STORAGE_KEY = 'ym_client_id';

export function getYandexCid(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setYandexCid(cid: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, cid);
  } catch {
    /* sandboxed iframe / private mode -- ignore */
  }
}
