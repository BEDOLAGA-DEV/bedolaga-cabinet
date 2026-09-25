/**
 * Favicon helpers.
 *
 * Статический фавикон index.html ведёт на /cabinet/branding/favicon у бота
 * (логотип из админки или монограмма) — его видят Safari и первая загрузка.
 * Когда брендинг известен, useDocumentBranding подменяет иконку скруглённым
 * логотипом (или монограммой в цвете акцента) через {@link setFavicon}; Safari
 * эту смену игнорирует, остальные браузеры применяют.
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

/** Сторона уменьшенной копии, по которой ищем цвет краёв: точность та же, пикселей меньше. */
const EDGE_SAMPLE_PX = 64;
const EDGE_OPAQUE_ALPHA = 250;
const EDGE_MIN_OPAQUE_SHARE = 0.5;
const EDGE_MIN_UNIFORM_SHARE = 0.9;
/** Допуск на канал: сглаживание и JPEG-шум дают разброс в единицы. */
const EDGE_COLOR_TOLERANCE = 12;

/**
 * Цвет, которым логотип залит до краёв; null — единого цвета у краёв нет.
 * Та же логика, что logo_edge_color у бота (app/cabinet/utils/app_icon.py).
 *
 * Логотип-плитка (сплошной квадрат, в том числе с запечённым скруглением) на
 * фоне темы превращается в квадрат в рамке: maskable-вариант ужимает содержимое
 * до 80 %, и на рабочем столе Android у иконки видны чёрные полоски по краям.
 * Такой логотип сам задаёт фон — продолжаем его цвет на всю плитку.
 *
 * Смотрим внешнюю кайму в один пиксель. Прозрачные пиксели не считаются (углы
 * запечённого скругления), но непрозрачных должно быть большинство: у знака на
 * прозрачном фоне кайма пустая, и фоном остаётся тема. Непрозрачные обязаны
 * сходиться к одному цвету — у фото и градиентов его нет, угадывать нельзя.
 */
export function edgeColorOfPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  if (width < 2 || height < 2) return null;
  const opaque: number[][] = [];
  let ring = 0;
  const visit = (x: number, y: number): void => {
    ring++;
    const i = (y * width + x) * 4;
    if (data[i + 3] >= EDGE_OPAQUE_ALPHA) opaque.push([data[i], data[i + 1], data[i + 2]]);
  };
  for (let x = 0; x < width; x++) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    visit(0, y);
    visit(width - 1, y);
  }
  if (opaque.length < ring * EDGE_MIN_OPAQUE_SHARE) return null;

  const median = [0, 1, 2].map(
    (channel) =>
      opaque.map((color) => color[channel]).sort((a, b) => a - b)[Math.floor(opaque.length / 2)],
  );
  const matching = opaque.filter((color) =>
    color.every((value, channel) => Math.abs(value - median[channel]) <= EDGE_COLOR_TOLERANCE),
  ).length;
  if (matching < opaque.length * EDGE_MIN_UNIFORM_SHARE) return null;
  return `rgb(${median[0]}, ${median[1]}, ${median[2]})`;
}

/** Цвет краёв картинки; null — его нет, canvas недоступен или запятнан чужим источником. */
function edgeColorOfImage(img: HTMLImageElement): string | null {
  const scale = Math.min(1, EDGE_SAMPLE_PX / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, width, height);
    return edgeColorOfPixels(ctx.getImageData(0, 0, width, height).data, width, height);
  } catch {
    return null;
  }
}

export interface SquareIconOptions {
  /** Непрозрачная заливка под содержимым (CSS-цвет), если логотип не залит до краёв сам. */
  background: string;
  /** Доля стороны под содержимое: 1 — во всю плитку, 0.8 — безопасная зона maskable. */
  contentScale?: number;
}

/**
 * Непрозрачная квадратная плитка для иконок ярлыков (apple-touch-icon, манифест).
 * iOS и Android накладывают на иконку свою маску и рисуют прозрачные пиксели
 * белым или чёрным — скруглённые углы с прозрачностью превращаются в белые
 * пятна. Поэтому: заливка на всю плитку, содержимое вписано целиком (contain)
 * и отцентровано, никакого клипа. Null — без canvas или при ошибке загрузки.
 */
export async function squareIconDataUri(
  src: string,
  size: number,
  options: SquareIconOptions,
): Promise<string | null> {
  if (!src) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    const img = await loadImage(src);
    // Логотип, залитый до краёв, сам задаёт фон — иначе вокруг него рамка цвета темы.
    ctx.fillStyle = edgeColorOfImage(img) ?? options.background;
    ctx.fillRect(0, 0, size, size);
    const scale = Math.min(size / img.width, size / img.height) * (options.contentScale ?? 1);
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
