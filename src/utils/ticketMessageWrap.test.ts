import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Тело сообщения тикета рендерится в трёх местах, и во всех трёх текст должен
 * переноситься по любому символу.
 *
 * `whitespace-pre-wrap` переносит только по пробелам, поэтому неразрывный токен
 * — ссылка на подписку, ключ, base64 — уезжает за пузырь. Заметить это нельзя:
 * контейнер сообщений идёт с `overflow-y-auto` (браузер добирает `overflow-x`
 * в `auto`), а полосу прокрутки прячет `.scrollbar-hide`. Замер в браузере на
 * ширине 1280px: без `break-words` контейнер 803px против содержимого 3179px,
 * то есть 2376px текста недостижимы ни колесом, ни глазом.
 *
 * Компоненты здесь не рендерятся (vitest на node, без jsdom), поэтому класс
 * проверяется по исходнику — рядом с тем самым `linkifyText(msg.message_text)`,
 * а не где угодно в файле.
 */

const RENDERERS = [
  'src/pages/Support.tsx',
  'src/pages/AdminTickets.tsx',
  'src/components/admin/userDetail/TicketsTab.tsx',
];

// className="..." непосредственно перед выводом тела сообщения
const MESSAGE_BODY_RE =
  /className="([^"]*)"\s*\n\s*dangerouslySetInnerHTML=\{\{\s*__html:\s*linkifyText\(msg\.message_text\)/g;

function messageBodyClasses(file: string): string[] {
  const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
  return [...source.matchAll(MESSAGE_BODY_RE)].map((match) => match[1]);
}

describe.each(RENDERERS)('%s', (file) => {
  it('renders the ticket message body', () => {
    expect(messageBodyClasses(file).length).toBeGreaterThan(0);
  });

  it('wraps long unbreakable tokens', () => {
    for (const classes of messageBodyClasses(file)) {
      expect(classes).toContain('whitespace-pre-wrap');
      expect(classes).toContain('break-words');
    }
  });
});
