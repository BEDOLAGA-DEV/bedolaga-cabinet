/**
 * Captures Yandex Metrika Client ID for offline conversions.
 * Uses the same counter that useAnalyticsCounters injects.
 */

/** localStorage key shared with useAnalyticsCounters */
export const YANDEX_CID_STORAGE_KEY = 'yandex_cid';

let cachedCounterId: string | null = null;

/**
 * Fetches the Yandex Metrika counter ID from branding API and caches it.
 */
async function fetchCounterId(): Promise<string | null> {
  if (cachedCounterId) return cachedCounterId;
  try {
    const resp = await fetch('/api/cabinet/branding/analytics');
    if (resp.ok) {
      const data = await resp.json();
      if (data.yandex_metrika_id) {
        cachedCounterId = data.yandex_metrika_id;
        return cachedCounterId;
      }
    }
  } catch {
    // silently fail
  }
  return null;
}

/**
 * Gets Yandex ClientID with timeout.
 * First checks localStorage (set by useAnalyticsCounters on page load),
 * then falls back to calling ym() directly with a polling wait.
 */
export async function getYandexCid(timeoutMs = 300): Promise<string | null> {
  try {
    const stored = localStorage.getItem(YANDEX_CID_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    return null;
  }

  const counterId = await fetchCounterId();
  if (!counterId) return null;

  return new Promise<string | null>((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    const pollInterval = 100;
    const deadline = Date.now() + timeoutMs;

    function tryGetCid() {
      if (resolved) return;

      try {
        const lsCid = localStorage.getItem(YANDEX_CID_STORAGE_KEY);
        if (lsCid) {
          resolved = true;
          clearTimeout(timer);
          resolve(lsCid);
          return;
        }
      } catch {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
        return;
      }

      const ym = (window as unknown as Record<string, unknown>).ym as
        | ((id: number, method: string, cb: (cid: string) => void) => void)
        | undefined;

      if (typeof ym === 'function') {
        try {
          ym(Number(counterId), 'getClientID', (cid: string) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve(cid);
            }
          });
        } catch {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        }
        return;
      }

      if (Date.now() < deadline) {
        setTimeout(tryGetCid, pollInterval);
      }
    }

    tryGetCid();
  });
}
