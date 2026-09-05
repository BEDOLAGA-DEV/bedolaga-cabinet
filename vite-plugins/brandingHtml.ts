import type { Plugin } from 'vite';
import { monogramDataUri, monogramLetter } from './brandMonogram';

/**
 * Подставляет бренд из переменных сборки в index.html.
 *
 * До этого в разметке были зашиты «VPN», «Cabinet» и фавикон «V», и каждая
 * инсталляция светила ими до прихода настроек с бэкенда (а ярлыки Android/iOS
 * забирали их навсегда). VITE_APP_NAME / VITE_APP_LOGO существовали, но до
 * index.html не доходили.
 */

export interface BrandingHtmlOptions {
  /** VITE_APP_NAME; пустая строка → «Cabinet». */
  name: string;
  /** VITE_APP_LOGO; пустая строка → первая буква имени. */
  logo: string;
  /**
   * VITE_API_URL; пустая строка → «/api». Нужен инлайн-скрипту index.html:
   * он запрашивает /cabinet/branding ещё до загрузки бандла, чтобы вкладка и
   * ярлыки не показывали значения сборки (готовый образ собран с «Cabinet»).
   */
  apiUrl?: string;
}

export const BRANDING_PLACEHOLDERS = {
  name: '__APP_NAME__',
  icon: '__APP_ICON__',
  apiUrl: '__API_URL__',
} as const;

export const DEFAULT_APP_NAME = 'Cabinet';
export const DEFAULT_API_URL = '/api';

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

export function renderBrandingHtml(html: string, options: BrandingHtmlOptions): string {
  const name = options.name.trim() || DEFAULT_APP_NAME;
  const letter = monogramLetter(options.logo, monogramLetter(name));
  const apiUrl = (options.apiUrl ?? '').trim() || DEFAULT_API_URL;
  const withName = replaceAll(html, BRANDING_PLACEHOLDERS.name, escapeHtml(name));
  const withIcon = replaceAll(withName, BRANDING_PLACEHOLDERS.icon, monogramDataUri(letter));
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
