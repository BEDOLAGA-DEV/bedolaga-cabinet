export const LINK_OAUTH_STATE_KEY = 'link_oauth_state';
export const LINK_OAUTH_PROVIDER_KEY = 'link_oauth_provider';

const OAUTH_STATE_KEY = 'oauth_state';
const OAUTH_PROVIDER_KEY = 'oauth_provider';

export function saveOAuthState(state: string, provider: string): void {
  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  sessionStorage.setItem(OAUTH_PROVIDER_KEY, provider);
}

export function loadOAuthState(): { state: string; provider: string } | null {
  const state = sessionStorage.getItem(OAUTH_STATE_KEY);
  const provider = sessionStorage.getItem(OAUTH_PROVIDER_KEY);
  if (!state || !provider) return null;
  return { state, provider };
}

export function clearOAuthState(): void {
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_PROVIDER_KEY);
}

export function peekLinkOAuthState(): { state: string; provider: string } | null {
  const state = sessionStorage.getItem(LINK_OAUTH_STATE_KEY);
  const provider = sessionStorage.getItem(LINK_OAUTH_PROVIDER_KEY);
  if (!state || !provider) return null;
  return { state, provider };
}

export function clearLinkOAuthState(): void {
  sessionStorage.removeItem(LINK_OAUTH_STATE_KEY);
  sessionStorage.removeItem(LINK_OAUTH_PROVIDER_KEY);
}

export function isOAuthConsentRequiredStatus428(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return false;
  }

  const response = (err as { response?: unknown }).response;
  if (!response || typeof response !== 'object' || !('status' in response)) {
    return false;
  }

  return (response as { status?: unknown }).status === 428;
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
