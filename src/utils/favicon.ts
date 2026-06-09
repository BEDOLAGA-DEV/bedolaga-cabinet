/**
 * Favicon helpers.
 *
 * The static fallback in index.html is a neutral monogram so the tab is never
 * left without an icon. Once branding is known we override it with the custom
 * logo (or a brand-letter monogram) via {@link setFavicon}.
 */

/** Point the page favicon at `href`, creating the <link> if needed. */
export function setFavicon(href: string): void {
  if (!href) return;
  let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Generate a square monogram favicon (SVG data URI) from a brand letter.
 * Used when the deployment has no custom logo, so every page still gets an
 * icon that matches the brand letter instead of the browser's blank default.
 */
export function letterFaviconDataUri(letter: string): string {
  const ch = (letter || 'V').trim().charAt(0).toUpperCase() || 'V';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="#0a0f1a"/>` +
    `<text x="50%" y="50%" font-family="Manrope,Arial,sans-serif" font-size="38" ` +
    `font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${ch}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Render `src` (e.g. a square custom logo) into a rounded-corner PNG data URI
 * so the favicon gets the same rounded tile as the header logo, instead of
 * hard square corners.
 *
 * `radiusRatio` 0.3 mirrors the header tile (rounded-linear-lg = 12px on a 40px
 * tile). Returns null if the image can't be loaded or the canvas is tainted —
 * the caller should fall back to the raw `src`.
 */
export async function roundedFaviconDataUri(
  src: string,
  size = 64,
  radiusRatio = 0.3,
): Promise<string | null> {
  if (!src) return null;
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

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
    img.onload = () => resolve(img);
    img.onerror = reject;
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
