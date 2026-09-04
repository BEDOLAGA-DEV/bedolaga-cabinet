/**
 * Квадратная монограмма бренда (SVG data URI) из одной буквы.
 *
 * Без обращения к DOM: один и тот же код рисует статический фавикон в index.html
 * на сборке (плагин brandingHtml) и запасной фавикон в рантайме, когда у
 * инсталляции нет загруженного логотипа. Иначе две копии разъезжаются.
 */

export interface MonogramColors {
  background: string;
  foreground: string;
}

export const DEFAULT_MONOGRAM_COLORS: MonogramColors = {
  background: '#0a0f1a',
  foreground: '#ffffff',
};

/** Первая буква строки заглавной; при пустой строке — `fallback`. */
export function monogramLetter(letter: string | null | undefined, fallback = 'V'): string {
  const ch = (letter ?? '').trim().charAt(0).toUpperCase();
  return ch || fallback;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function monogramSvg(
  letter: string,
  colors: MonogramColors = DEFAULT_MONOGRAM_COLORS,
): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${escapeXml(colors.background)}"/>` +
    `<text x="50%" y="50%" font-family="Manrope,Arial,sans-serif" font-size="38" ` +
    `font-weight="700" fill="${escapeXml(colors.foreground)}" text-anchor="middle" ` +
    `dominant-baseline="central">${escapeXml(monogramLetter(letter))}</text>` +
    `</svg>`
  );
}

export function monogramDataUri(
  letter: string,
  colors: MonogramColors = DEFAULT_MONOGRAM_COLORS,
): string {
  return `data:image/svg+xml,${encodeURIComponent(monogramSvg(letter, colors))}`;
}
