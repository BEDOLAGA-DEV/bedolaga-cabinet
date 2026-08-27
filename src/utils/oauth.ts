import { safeSession } from './safeStorage';

export const LINK_OAUTH_STATE_KEY = 'link_oauth_state';
export const LINK_OAUTH_PROVIDER_KEY = 'link_oauth_provider';

const OAUTH_STATE_KEY = 'oauth_state';
const OAUTH_PROVIDER_KEY = 'oauth_provider';

/**
 * Сохраняет CSRF-state перед уходом на внешнего провайдера.
 *
 * Возвращает false, если запись не переживёт редирект (хранилище заблокировано
 * или переполнено): in-memory фоллбек умирает вместе со страницей, а на возврате
 * OAuthCallback не найдёт состояния и уйдёт в ветку link-server, то есть попробует
 * ПРИВЯЗКУ вместо логина. Вызывающий обязан не делать переход при false.
 */
export function saveOAuthState(state: string, provider: string): boolean {
  const savedState = safeSession.setItem(OAUTH_STATE_KEY, state);
  const savedProvider = safeSession.setItem(OAUTH_PROVIDER_KEY, provider);
  return savedState && savedProvider;
}

/** То же для привязки аккаунта: см. saveOAuthState. */
export function saveLinkOAuthState(state: string, provider: string): boolean {
  const savedState = safeSession.setItem(LINK_OAUTH_STATE_KEY, state);
  const savedProvider = safeSession.setItem(LINK_OAUTH_PROVIDER_KEY, provider);
  return savedState && savedProvider;
}

export function loadOAuthState(): { state: string; provider: string } | null {
  const state = safeSession.getItem(OAUTH_STATE_KEY);
  const provider = safeSession.getItem(OAUTH_PROVIDER_KEY);
  if (!state || !provider) return null;
  return { state, provider };
}

export function clearOAuthState(): void {
  safeSession.removeItem(OAUTH_STATE_KEY);
  safeSession.removeItem(OAUTH_PROVIDER_KEY);
}

export function peekLinkOAuthState(): { state: string; provider: string } | null {
  const state = safeSession.getItem(LINK_OAUTH_STATE_KEY);
  const provider = safeSession.getItem(LINK_OAUTH_PROVIDER_KEY);
  if (!state || !provider) return null;
  return { state, provider };
}

export function clearLinkOAuthState(): void {
  safeSession.removeItem(LINK_OAUTH_STATE_KEY);
  safeSession.removeItem(LINK_OAUTH_PROVIDER_KEY);
}

export function getErrorDetail(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { detail?: unknown } } }).response;
    const detail = resp?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const msg = (detail as Record<string, unknown>).message;
      if (typeof msg === 'string') return msg;
    }
  }
  if (err instanceof Error) return err.message;
  return null;
}
