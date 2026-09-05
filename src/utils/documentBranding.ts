/**
 * Бренд в <head>: заголовок вкладки, имя приложения для ярлыков (Android читает
 * манифест и application-name, iOS — apple-mobile-web-app-title), иконки и
 * веб-манифест. Единственный владелец — useDocumentBranding; страницы, которым
 * нужен свой заголовок (SEO лендинга), переписывают его сами и восстанавливают.
 */
import { STORAGE_KEYS } from '@/config/constants';
import { safeLocal } from './safeStorage';

/** Подсказка для инлайн-скрипта index.html: что показать до прихода брендинга. */
export interface BrandHint {
  name: string;
  letter: string;
  /** PNG data URI фавикона; SVG и крупные не сохраняем — см. isRasterHintIcon. */
  icon?: string;
}

// Фавикон из загруженного логотипа — PNG 64×64 с canvas, у «фотографичных»
// логотипов это 15–25 тысяч символов base64. Прежний порог в 16 000 молча
// выбрасывал именно их: имя в подсказке было, а иконка нет, и до старта React
// вкладка показывала монограмму сборки. Лимит localStorage — мегабайты.
const HINT_ICON_MAX_CHARS = 96_000;

/**
 * Иконка подсказки — только PNG из canvas. Инлайн-скрипт index.html ставит её
 * ещё до загрузки бандла, а Safari берёт фавикон только в этот момент и SVG
 * рисует монохромной плиткой с буквой. SVG в подсказке значил бы, что Safari
 * не увидит ни логотип по ссылке на эндпоинт бота, ни цвета монограммы —
 * навсегда, потому что до ссылки из index.html он уже не доходит.
 */
const HINT_ICON_PREFIX = 'data:image/png;';

export function isRasterHintIcon(icon: unknown): icon is string {
  return (
    typeof icon === 'string' &&
    icon.startsWith(HINT_ICON_PREFIX) &&
    icon.length <= HINT_ICON_MAX_CHARS
  );
}

export function readBrandHint(): BrandHint | null {
  const raw = safeLocal.getJson<unknown>(STORAGE_KEYS.BRAND_HINT, null);
  if (!raw || typeof raw !== 'object') return null;
  const { name, letter, icon } = raw as Record<string, unknown>;
  if (typeof name !== 'string' || typeof letter !== 'string') return null;
  return { name, letter, icon: isRasterHintIcon(icon) ? icon : undefined };
}

/**
 * Атрибут на <html>: React применил бренд. Инлайн-скрипт index.html, который
 * запросил /cabinet/branding ещё до загрузки бандла, после этого не вмешивается —
 * иначе на медленном API его сырой логотип затёр бы нашу скруглённую иконку.
 */
export const BRAND_READY_ATTR = 'data-brand-ready';

export function markBrandApplied(): void {
  document.documentElement.setAttribute(BRAND_READY_ATTR, '1');
}

export function writeBrandHint(hint: BrandHint): void {
  const icon = isRasterHintIcon(hint.icon) ? hint.icon : undefined;
  safeLocal.setJson(STORAGE_KEYS.BRAND_HINT, {
    name: hint.name,
    letter: hint.letter,
    ...(icon ? { icon } : {}),
  });
}

function upsertMeta(name: string, content: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function upsertLink(rel: string): HTMLLinkElement {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  return link;
}

/**
 * Заголовок вкладки. `previous` — что ставили сами в прошлый раз: если страница
 * с тех пор переписала заголовок под себя, не трогаем его. Возвращает значение,
 * которое надо передать сюда следующим вызовом.
 */
export function setDocumentTitle(name: string, previous: string | null): string {
  if (previous !== null && document.title !== previous) return previous;
  document.title = name;
  return name;
}

export function setAppNameMeta(name: string): void {
  upsertMeta('application-name', name);
  upsertMeta('apple-mobile-web-app-title', name);
}

export function setAppleTouchIcon(href: string | null): void {
  if (!href) {
    document.head.querySelector('link[rel="apple-touch-icon"]')?.remove();
    return;
  }
  upsertLink('apple-touch-icon').href = href;
}

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  /** any — как есть; maskable — лаунчер Android режет по своей форме, содержимое в безопасной зоне. */
  purpose?: 'any' | 'maskable';
}

export interface WebManifestInput {
  name: string;
  icons: ManifestIcon[];
  themeColor: string;
  backgroundColor: string;
}

export function buildWebManifest(input: WebManifestInput): Record<string, unknown> {
  // У манифеста в data: URI нет своего адреса, поэтому start_url и scope —
  // абсолютные, от корня приложения.
  const base = new URL(import.meta.env.BASE_URL || '/', window.location.origin).href;
  return {
    name: input.name,
    short_name: input.name,
    start_url: base,
    scope: base,
    display: 'standalone',
    background_color: input.backgroundColor,
    theme_color: input.themeColor,
    icons: input.icons,
  };
}

export function setWebManifest(input: WebManifestInput): void {
  const json = JSON.stringify(buildWebManifest(input));
  upsertLink('manifest').href = `data:application/manifest+json,${encodeURIComponent(json)}`;
}
