/**
 * Normalise a user-supplied redirect / returnTo URL down to a safe in-app path.
 *
 * Returns the input unchanged when it is a plain absolute path (`/foo/bar`).
 * Returns `/` otherwise — for protocol-relative URLs (`//evil.com`), absolute
 * URLs (`https://…`), exotic schemes (`javascript:`, `data:`), or anything
 * that smuggles a host through URL encoding (`%2F%2Fevil.com`).
 *
 * Even with react-router's navigate() — which only treats inputs as paths
 * and won't trigger an external nav — pasted absolute URLs would still
 * produce ugly path artifacts. Centralising the check matches what
 * TelegramRedirect already did and gives every returnTo entry the same
 * shape.
 */
export function getSafeRedirectPath(url: string | null | undefined): string {
  if (!url) return '/';
  // Only allow relative paths starting with /
  if (!url.startsWith('/') || url.startsWith('//')) {
    return '/';
  }
  // Catch the encoded forms (//evil.com → %2F%2Fevil.com, scheme://…)
  try {
    const decoded = decodeURIComponent(url);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('://')) {
      return '/';
    }
  } catch {
    return '/';
  }
  return url;
}
