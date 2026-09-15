// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { htmlToText } from './htmlToText';

describe('htmlToText', () => {
  it('убирает теги Telegram и оставляет текст', () => {
    expect(htmlToText('<b>Важно:</b> <i>сервер</i> <a href="https://t.me/x">переехал</a>')).toBe(
      'Важно: сервер переехал',
    );
  });

  it('раскрывает сущности', () => {
    expect(htmlToText('5 &lt; 7 &amp; 8 &gt; 6')).toBe('5 < 7 & 8 > 6');
  });

  it('пустое — пустая строка', () => {
    expect(htmlToText(null)).toBe('');
    expect(htmlToText('')).toBe('');
  });

  it('не выполняет скрипты и обработчики', () => {
    expect(htmlToText('<img src=x onerror="window.__pwned=1">текст')).toBe('текст');
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });
});
