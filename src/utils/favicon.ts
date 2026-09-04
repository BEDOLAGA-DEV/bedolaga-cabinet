/**
 * Favicon helpers.
 *
 * Статический фавикон index.html — монограмма из VITE_APP_LOGO; когда брендинг
 * известен, useDocumentBranding подменяет её логотипом инсталляции (или
 * монограммой в цвете акцента) через {@link setFavicon}.
 */
import {
  DEFAULT_MONOGRAM_COLORS,
  type MonogramColors,
  monogramDataUri,
  monogramLetter,
} from '../../vite-plugins/brandMonogram';

const IMAGE_LOAD_TIMEOUT_MS = 8000;

/** Поставить фавикон `href`, заменив существующие <link rel="icon">. */
export function setFavicon(href: string): void {
  if (!href) return;
  // Именно замена узла: при смене href у существующего <link> Firefox и Safari
  // не всегда перерисовывают иконку вкладки.
  const stale = document.querySelectorAll<HTMLLinkElement>(
    "link[rel='icon'], link[rel='shortcut icon']",
  );
  for (const link of stale) link.remove();
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = href;
  document.head.appendChild(link);
}

/** Квадратная монограмма (SVG data URI) из буквы бренда. */
export function letterFaviconDataUri(
  letter: string,
  colors: MonogramColors = DEFAULT_MONOGRAM_COLORS,
): string {
  return monogramDataUri(monogramLetter(letter), colors);
}

/**
 * Render `src` (e.g. a square custom logo) into a rounded-corner PNG data URI
 * so the favicon gets the same rounded tile as the header logo, instead of
 * hard square corners.
 *
 * `radiusRatio` 0.3 mirrors the header tile (rounded-linear-lg = 12px on a 40px
 * tile). Returns null if canvas is unavailable, the image can't be loaded or
 * the canvas is tainted — the caller should fall back to the raw `src`.
 */
export async function roundedFaviconDataUri(
  src: string,
  size = 64,
  radiusRatio = 0.3,
): Promise<string | null> {
  if (!src) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  // Проверяем canvas ДО загрузки картинки: в средах без него (jsdom) onload
  // не приходит никогда, и вызывающий повис бы на ожидании.
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    const img = await loadImage(src);
    traceRoundedRect(ctx, size, size * radiusRatio);
    ctx.clip();

    // object-fit: cover — fill the rounded tile, center-cropping any overflow.
    const scale = Math.max(size / img.width, size / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(
      () => reject(new Error('image load timeout')),
      IMAGE_LOAD_TIMEOUT_MS,
    );
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('image load failed'));
    };
    img.src = src;
  });
}

/** Trace a centered square rounded-rect path of side `size` and corner `r`. */
function traceRoundedRect(ctx: CanvasRenderingContext2D, size: number, r: number): void {
  const radius = Math.min(r, size / 2);
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(size, 0, size, size, radius);
  ctx.arcTo(size, size, 0, size, radius);
  ctx.arcTo(0, size, 0, 0, radius);
  ctx.arcTo(0, 0, size, 0, radius);
  ctx.closePath();
}
