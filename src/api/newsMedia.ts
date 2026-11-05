import apiClient from './client';

/** Public uploaded images/videos share the API proxy, not the SPA's static root. */
export function resolveNewsMediaUrl(url: string, uploaded = false): string {
  const origin = typeof window === 'undefined' ? 'https://cabinet.example' : window.location.origin;
  try {
    const target = new URL(url, origin);
    const api = new URL(apiClient.getUri({ url: '/cabinet/uploads/' }), origin);
    if (!uploaded && target.origin !== origin && target.origin !== api.origin) return url;
    const match = target.pathname.match(/^\/(?:cabinet\/)?uploads\/(images|videos)\/(.+)$/);
    if (!match) return url;
    const resolved = `${apiClient.getUri({ url: `/cabinet/uploads/${match[1]}/${match[2]}` })}${target.search}${target.hash}`;
    // Editors validate absolute HTTP(S) URLs before storing media.
    return typeof window === 'undefined' ? resolved : new URL(resolved, origin).href;
  } catch {
    return url;
  }
}

/** Rewrite only media source attributes; the renderer still sanitizes the HTML. */
export function resolveNewsMediaContent(content: string): string {
  return content.replace(/(<(?:img|video|source)\b[^>]*>)/gi, (tag) =>
    tag.replace(
      /(\b(?:src|poster)\s*=\s*)(["'])(.*?)\2/gi,
      (_: string, prefix: string, quote: string, url: string) =>
        `${prefix}${quote}${resolveNewsMediaUrl(url)}${quote}`,
    ),
  );
}
