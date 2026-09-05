import type { Plugin } from 'vite';

/**
 * Подставляет бренд из переменных сборки в index.html.
 *
 * Имя (VITE_APP_NAME) — в <title> и меты ярлыков: их видно до ответа API.
 * Фавикон — ссылкой на /cabinet/branding/favicon у бота, а не data: URI из
 * сборки: Safari берёт иконку только при первой загрузке страницы и игнорирует
 * смену через JS, так что единственный способ показать ему логотип из админки —
 * чтобы статическая ссылка сразу вела на него. У ссылки свой адрес, а не
 * /cabinet/branding/logo: фавикон грузится без Origin, и попади его ответ в кеш,
 * fetch() логотипа получил бы копию без CORS-заголовков.
 * Адрес API (VITE_API_URL) — в инлайн-скрипт, который запрашивает имя до бандла.
 */

export interface BrandingHtmlOptions {
  /** VITE_APP_NAME; пустая строка → «Cabinet». */
  name: string;
  /** VITE_API_URL; пустая строка → «/api». */
  apiUrl?: string;
}

export const BRANDING_PLACEHOLDERS = {
  name: '__APP_NAME__',
  icon: '__APP_ICON__',
  apiUrl: '__API_URL__',
} as const;

export const DEFAULT_APP_NAME = 'Cabinet';
export const DEFAULT_API_URL = '/api';
/** Эндпоинт бота: логотип из админки, без него — монограмма. Никогда не 404. */
export const FAVICON_PATH = '/cabinet/branding/favicon';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Значение внутри одинарных кавычек JS-строки в инлайн-скрипте; `<` — чтобы не собрать `</script>`. */
function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/</g, '\\x3C')
    .replace(/\r?\n/g, '\\n');
}

function replaceAll(html: string, placeholder: string, value: string): string {
  return html.split(placeholder).join(value);
}

export function resolveApiUrl(apiUrl: string | undefined): string {
  return (apiUrl ?? '').trim() || DEFAULT_API_URL;
}

export function faviconUrl(apiUrl: string): string {
  return `${apiUrl.replace(/\/+$/, '')}${FAVICON_PATH}`;
}

export function renderBrandingHtml(html: string, options: BrandingHtmlOptions): string {
  const name = options.name.trim() || DEFAULT_APP_NAME;
  const apiUrl = resolveApiUrl(options.apiUrl);
  const withName = replaceAll(html, BRANDING_PLACEHOLDERS.name, escapeHtml(name));
  const withIcon = replaceAll(withName, BRANDING_PLACEHOLDERS.icon, escapeHtml(faviconUrl(apiUrl)));
  return replaceAll(withIcon, BRANDING_PLACEHOLDERS.apiUrl, escapeJsString(apiUrl));
}

export function brandingHtml(options: BrandingHtmlOptions): Plugin {
  return {
    name: 'bedolaga:branding-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => renderBrandingHtml(html, options),
    },
  };
}
