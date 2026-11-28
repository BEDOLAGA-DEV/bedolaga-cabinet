import { describe, expect, it } from 'vitest';
import { hasBrandMarkup, parseBrandName, stripBrandMarkup } from './brandName';

describe('parseBrandName', () => {
  it('имя без разметки — один обычный сегмент', () => {
    expect(parseBrandName('berlinconnection')).toEqual([{ text: 'berlinconnection' }]);
  });

  it('красит слово после метки', () => {
    expect(parseBrandName('berlin{#FF8A00}connection')).toEqual([
      { text: 'berlin' },
      { text: 'connection', color: '#FF8A00' },
    ]);
  });

  it('несколько меток подряд, как в Remnawave', () => {
    expect(parseBrandName('{#B8F2E6}Re{#FFA69E}mna{#AEC6CF}wave')).toEqual([
      { text: 'Re', color: '#B8F2E6' },
      { text: 'mna', color: '#FFA69E' },
      { text: 'wave', color: '#AEC6CF' },
    ]);
  });

  it('цвет действует только на слово: после пробела текст снова обычный', () => {
    expect(parseBrandName('{#fff}Berlin Connection')).toEqual([
      { text: 'Berlin', color: '#fff' },
      { text: ' Connection' },
    ]);
  });

  it('принимает короткий HEX из трёх цифр', () => {
    expect(parseBrandName('a{#f80}b')).toEqual([{ text: 'a' }, { text: 'b', color: '#f80' }]);
  });

  it('метка без слова после неё пропадает', () => {
    expect(parseBrandName('berlin{#FF8A00}')).toEqual([{ text: 'berlin' }]);
    expect(parseBrandName('berlin{#FF8A00} x')).toEqual([{ text: 'berlin x' }]);
  });

  it('чужие и битые метки остаются обычным текстом', () => {
    expect(parseBrandName('{cyan}a')).toEqual([{ text: '{cyan}a' }]);
    expect(parseBrandName('{#GG0000}a')).toEqual([{ text: '{#GG0000}a' }]);
    expect(parseBrandName('{#FF8A00a')).toEqual([{ text: '{#FF8A00a' }]);
    expect(parseBrandName('{#FF8A0}a')).toEqual([{ text: '{#FF8A0}a' }]);
  });

  it('пустая строка — нет сегментов', () => {
    expect(parseBrandName('')).toEqual([]);
  });

  it('склеенный текст сегментов равен stripBrandMarkup', () => {
    const samples = ['berlin{#FF8A00}connection', '{#fff}A B{#000}c d', 'x{#12}y', ''];
    for (const s of samples) {
      expect(
        parseBrandName(s)
          .map((p) => p.text)
          .join(''),
      ).toBe(stripBrandMarkup(s));
    }
  });
});

describe('stripBrandMarkup', () => {
  it('убирает метки и оставляет текст', () => {
    expect(stripBrandMarkup('berlin{#FF8A00}connection')).toBe('berlinconnection');
    expect(stripBrandMarkup('{#B8F2E6}Re{#FFA69E}mna')).toBe('Remna');
  });

  it('обычное имя не меняет, повторный вызов безопасен', () => {
    expect(stripBrandMarkup('Zero {Ping}')).toBe('Zero {Ping}');
    const once = stripBrandMarkup('a{#fff}b');
    expect(stripBrandMarkup(once)).toBe(once);
  });
});

describe('hasBrandMarkup', () => {
  it('замечает метку цвета', () => {
    expect(hasBrandMarkup('a{#fff}b')).toBe(true);
    expect(hasBrandMarkup('ab')).toBe(false);
    expect(hasBrandMarkup('a{cyan}b')).toBe(false);
  });
});
