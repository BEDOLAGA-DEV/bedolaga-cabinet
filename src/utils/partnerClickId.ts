/**
 * Partner / affiliate click_id helpers (Keitaro etc.).
 *
 * Captures `?click_id=` from the landing URL and persists it in localStorage
 * so that the cabinet can sync it to the backend after the user authenticates.
 * Backend stores it in `yandex_client_id_map.subid`; the central S2S postback
 * listener uses that subid for every subsequent deposit event.
 */

const STORAGE_KEY = 'partner_click_id';
const SENT_KEY = 'partner_click_id_sent';

export function getPartnerClickId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setPartnerClickId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* sandboxed iframe / private mode -- ignore */
  }
}

export function clearPartnerClickIdSentFlag(): void {
  try {
    localStorage.removeItem(SENT_KEY);
  } catch {
    /* ignore */
  }
}

export function isPartnerClickIdSent(): boolean {
  try {
    return Boolean(localStorage.getItem(SENT_KEY));
  } catch {
    return false;
  }
}

export function markPartnerClickIdSent(): void {
  try {
    localStorage.setItem(SENT_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Capture `click_id` (and optional `campaign`) from current URL query.
 * Returns the captured id or null.
 */
export function capturePartnerClickIdFromUrl(): string | null {
  try {
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get('click_id') || sp.get('clickid');
    if (id && /^[A-Za-z0-9._:-]{1,128}$/.test(id)) {
      const prev = getPartnerClickId();
      if (prev !== id) {
        // New click_id arrived (or first time) — refresh sent flag so we
        // resync on next auth.
        clearPartnerClickIdSentFlag();
      }
      setPartnerClickId(id);
      return id;
    }
  } catch {
    /* ignore */
  }
  return null;
}
