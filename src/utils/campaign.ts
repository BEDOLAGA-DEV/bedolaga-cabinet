const CAMPAIGN_KEY = 'campaign_slug';
const CAMPAIGN_TTL_KEY = 'campaign_slug_ttl';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SLUG_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Get valid slug from localStorage, clearing expired entries.
 */
function getValidSlug(): string | null {
  try {
    const slug = localStorage.getItem(CAMPAIGN_KEY);
    if (!slug) return null;

    const ttl = localStorage.getItem(CAMPAIGN_TTL_KEY);
    if (!ttl || Number.isNaN(Number(ttl)) || Date.now() > Number(ttl)) {
      localStorage.removeItem(CAMPAIGN_KEY);
      localStorage.removeItem(CAMPAIGN_TTL_KEY);
      return null;
    }

    return slug;
  } catch {
    return null;
  }
}

function clearSlug(): void {
  try {
    localStorage.removeItem(CAMPAIGN_KEY);
    localStorage.removeItem(CAMPAIGN_TTL_KEY);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Capture campaign slug from URL query param, store in localStorage with TTL,
 * and clean the URL.
 */
export function captureCampaignFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('campaign');
    if (!slug || !SLUG_PATTERN.test(slug)) return;

    localStorage.setItem(CAMPAIGN_KEY, slug);
    localStorage.setItem(CAMPAIGN_TTL_KEY, String(Date.now() + TTL_MS));

    // Clean URL
    params.delete('campaign');
    const newSearch = params.toString();
    const newUrl =
      window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
    window.history.replaceState(null, '', newUrl);
  } catch {
    // localStorage or history API unavailable
  }
}

/**
 * Consume (get + clear) the stored campaign slug. One-time use during auth.
 */
export function consumeCampaignSlug(): string | null {
  const slug = getValidSlug();
  if (slug) clearSlug();
  return slug;
}

/**
 * Read stored campaign slug without clearing it (for email registration flow).
 */
export function getPendingCampaignSlug(): string | null {
  return getValidSlug();
}
