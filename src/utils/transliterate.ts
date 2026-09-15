/**
 * Кириллица латиницей для адресов и меток: «Иван Петров» → «ivan petrov».
 * Одна таблица на весь кабинет — раньше две одинаковые копии жили в редакторах
 * новостей и справки, а метка кампании партнёра кириллицу просто выбрасывала
 * («partner_»).
 */
export const TRANSLIT_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function transliterate(text: string): string {
  return Array.from(text.toLowerCase())
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join('');
}
