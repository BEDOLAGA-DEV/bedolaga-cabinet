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
    const resp = await fetch('/cabinet/branding/analytics');
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
export async function getYandexCid(timeoutMs = 2000): Promise<string | null> {
  // Check localStorage first — survives page reloads and OAuth redirects
  const stored = localStorage.getItem(YANDEX_CID_STORAGE_KEY);
  if (stored) return stored;

  const counterId = await fetchCounterId();
  if (!counterId) return null;

  // Wait for ym to become available (async script loading after OAuth redirect)
  return new Promise<string | null>((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const pollInterval = 100;

    function tryGetCid() {
      // Re-check localStorage (Metrika init may have saved it while we waited)
      const lsCid = localStorage.getItem(YANDEX_CID_STORAGE_KEY);
      if (lsCid) {
        resolve(lsCid);
        return;
      }

      const ym = (window as unknown as Record<string, unknown>).ym as
        | ((id: number, method: string, cb: (cid: string) => void) => void)
        | undefined;

      if (typeof ym === 'function') {
        try {
          ym(Number(counterId), 'getClientID', (cid: string) => {
            resolve(cid);
          });
        } catch {
          resolve(null);
        }
        return;
      }

      if (Date.now() < deadline) {
        setTimeout(tryGetCid, pollInterval);
      } else {
        resolve(null);
      }
    }

    tryGetCid();
  });
}
