/**
 * Captures Yandex Metrika Client ID for offline conversions.
 * Uses the same counter that useAnalyticsCounters injects.
 */

let cachedCid: string | null = null;
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
 * Returns null if Metrika is not loaded or counter is not configured.
 */
export async function getYandexCid(timeoutMs = 1500): Promise<string | null> {
  if (cachedCid) return cachedCid;

  const counterId = await fetchCounterId();
  if (!counterId) return null;

  const ym = (window as unknown as Record<string, unknown>).ym as
    | ((id: number, method: string, cb: (cid: string) => void) => void)
    | undefined;

  if (typeof ym !== 'function') return null;

  return new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      ym(Number(counterId), 'getClientID', (cid: string) => {
        clearTimeout(timer);
        cachedCid = cid;
        resolve(cid);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
