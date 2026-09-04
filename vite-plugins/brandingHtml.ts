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
}

export const BRANDING_PLACEHOLDERS = {
  name: '__APP_NAME__',
  icon: '__APP_ICON__',
} as const;

export const DEFAULT_APP_NAME = 'Cabinet';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceAll(html: string, placeholder: string, value: string): string {
  return html.split(placeholder).join(value);
}

export function renderBrandingHtml(html: string, options: BrandingHtmlOptions): string {
  const name = options.name.trim() || DEFAULT_APP_NAME;
  const letter = monogramLetter(options.logo, monogramLetter(name));
  const withName = replaceAll(html, BRANDING_PLACEHOLDERS.name, escapeHtml(name));
  return replaceAll(withName, BRANDING_PLACEHOLDERS.icon, monogramDataUri(letter));
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
