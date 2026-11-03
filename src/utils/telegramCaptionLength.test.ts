// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { telegramCaptionLength } from './telegramCaptionLength';

describe('telegramCaptionLength', () => {
  it.each([
    ['  <b>Hello</b> &amp; &#x1F600;  ', 'Hello & 😀'],
    ['&lt;b&gt;hi&lt;/b&gt;', '<b>hi</b>'],
    ['&amp;lt;', '&lt;'],
    ['<tg-emoji emoji-id="123">😀</tg-emoji>', '😀'],
    ['<script>alert(1)</script>', 'alert(1)'],
    ['<<script>img src=x onerror=alert(1)>', '<img src=x onerror=alert(1)>'],
    ['&lt;img src=x onerror=alert(1)&gt;', '<img src=x onerror=alert(1)>'],
    ['a < b', 'a < b'],
    ['فارسی\n中文', 'فارسی\n中文'],
  ])('counts text without turning %s into markup', (input, text) => {
    expect(telegramCaptionLength(input)).toBe(Array.from(text).length);
    expect(document.querySelector('img, script')).toBeNull();
  });

  it('counts astral characters as single characters at the caption boundary', () => {
    expect(telegramCaptionLength(`<b>${'😀'.repeat(1024)}</b>`)).toBe(1024);
    expect(telegramCaptionLength('😀'.repeat(1025))).toBe(1025);
  });
});
