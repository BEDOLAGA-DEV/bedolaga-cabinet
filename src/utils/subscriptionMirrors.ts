export interface SubscriptionMirror {
  id: string;
  label: string;
  url: string;
}
export interface MirrorConnection {
  subscription_id?: number;
  connect_mode: string;
  hide_link: boolean;
  mirrors?: SubscriptionMirror[];
}
export function availableMirrors(data?: MirrorConnection, hidden = false): SubscriptionMirror[] {
  if (
    !data ||
    hidden ||
    data.hide_link ||
    !['guide', 'link', 'miniapp_subscription'].includes(data.connect_mode)
  )
    return [];
  return (data.mirrors ?? []).filter((mirror) => {
    if (!/^[a-f0-9]{16}$/.test(mirror.id)) return false;
    try {
      const url = new URL(mirror.url);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  });
}
export function selectedMirrorUrl(
  main: string | null,
  mirrors: SubscriptionMirror[],
  id: string | null,
): string | null {
  return mirrors.find((mirror) => mirror.id === id)?.url ?? main;
}
/** Substitute a complete known subscription URL, including encoded import arguments. */
export function replaceSubscriptionUrl(
  value: string,
  main: string | null,
  selected: string | null,
): string {
  if (!main || !selected || main === selected) return value;
  for (const [from, to] of [
    [encodeURIComponent(main), encodeURIComponent(selected)],
    [main, selected],
  ]) {
    if (value === from) return to;
    const index = value.indexOf(from);
    if (
      index >= 0 &&
      (value[index - 1] === '=' ||
        (value[index - 1] === '/' &&
          /^[a-z][a-z0-9+.-]*:\/\//i.test(value) &&
          !/^https?:/i.test(value))) &&
      (index + from.length === value.length || /^[&#\s]/.test(value.slice(index + from.length)))
    ) {
      return value.slice(0, index) + to + value.slice(index + from.length);
    }
  }
  return value;
}

/** Rebind subscription actions while preserving copy, external links and localized prose. */
export function mirrorAppConfig<T>(config: T, main: string | null, selected: string | null): T {
  if (!main || !selected || main === selected) return config;
  const rewrite = (value: unknown, key = ''): unknown => {
    if (
      [
        'text',
        'title',
        'description',
        'svgLibrary',
        'baseTranslations',
        'platformNames',
        'branding',
      ].includes(key)
    )
      return value;
    if (typeof value === 'string')
      return ['subscriptionUrl', 'resolvedUrl', 'url', 'link', 'deepLink'].includes(key)
        ? replaceSubscriptionUrl(value, main, selected)
        : value;
    if (Array.isArray(value)) return value.map((item) => rewrite(item));
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>;
      if (item.type === 'external') return value;
      const result = Object.fromEntries(
        Object.entries(item).map(([name, child]) => [name, rewrite(child, name)]),
      );
      if (item.type === 'subscriptionLink') {
        const template = [item.url, item.link].find(
          (candidate) =>
            typeof candidate === 'string' &&
            /\{\{(?:SUBSCRIPTION_LINK|HAPP_CRYPT[34]?_LINK)\}\}/.test(candidate),
        );
        if (template) result.resolvedUrl = template;
      }
      return result;
    }
    return value;
  };
  return rewrite(config) as T;
}
