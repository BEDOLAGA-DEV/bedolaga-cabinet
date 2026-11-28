/**
 * Имя бренда с цветом: «berlin{#FF8A00}connection» — слово сразу после метки
 * красится в указанный HEX (#RGB или #RRGGBB), остальной текст остаётся обычным.
 * Тот же синтаксис, что в панели Remnawave. Цвет действует до пробела или
 * до следующей метки.
 *
 * Имя из настроек попадает не только в шапку, но и в заголовок вкладки, ярлык,
 * манифест и alt — там разметка недопустима, поэтому на входе из API имя
 * разбирается на `name` (чистый текст) и `name_markup` (как набрано в админке).
 */

export interface BrandNameSegment {
  text: string;
  /** HEX-цвет метки; у обычного текста отсутствует. */
  color?: string;
}

const MARKER = /\{(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\}/;
const MARKER_GLOBAL = new RegExp(MARKER.source, 'g');

export function parseBrandName(markup: string): BrandNameSegment[] {
  // split с группой: [текст, цвет, текст, цвет, текст, ...]
  const parts = markup.split(new RegExp(MARKER.source));
  const segments: BrandNameSegment[] = [];

  const push = (text: string, color?: string) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last && last.color === color) last.text += text;
    else segments.push(color ? { text, color } : { text });
  };

  push(parts[0] ?? '');
  for (let i = 1; i < parts.length; i += 2) {
    const color = parts[i];
    const text = parts[i + 1] ?? '';
    const word = /^\S*/.exec(text)?.[0] ?? '';
    push(word, color);
    push(text.slice(word.length));
  }
  return segments;
}

/** Имя без меток цвета — для вкладки, ярлыка, манифеста, alt и текстов. */
export function stripBrandMarkup(markup: string): string {
  return markup.replace(MARKER_GLOBAL, '');
}

export function hasBrandMarkup(markup: string): boolean {
  return MARKER.test(markup);
}
