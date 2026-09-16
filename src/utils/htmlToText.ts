/**
 * Текст сообщения с разметкой Telegram (<b>, <i>, <a>…) — для короткого превью.
 * Разметку не показываем тегами: админ видел в карточке «<b>Важно</b>».
 * DOMParser разбирает документ без выполнения скриптов и загрузки картинок.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').trim();
}
