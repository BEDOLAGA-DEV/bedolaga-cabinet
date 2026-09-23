import { describe, expect, it } from 'vitest';
import { edgeColorOfPixels } from './favicon';

type Rgba = [number, number, number, number];

const RED: Rgba = [0xe5, 0x39, 0x35, 255];
const BLUE: Rgba = [0x1e, 0x88, 0xe5, 255];
const CLEAR: Rgba = [0, 0, 0, 0];

/** RGBA-буфер как у ImageData: цвет пикселя задаёт `paint(x, y)`. */
function pixels(size: number, paint: (x: number, y: number) => Rgba): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) data.set(paint(x, y), (y * size + x) * 4);
  }
  return data;
}

describe('edgeColorOfPixels', () => {
  // Логотип-плитка на фоне тёмной темы: maskable ужимает содержимое до 80 %, и у
  // иконки на рабочем столе Android появлялись чёрные полоски по краям.
  it('returns the color a full-bleed logo is filled with', () => {
    const data = pixels(20, (x, y) => (x > 5 && x < 14 && y > 5 && y < 14 ? BLUE : RED));
    expect(edgeColorOfPixels(data, 20, 20)).toBe('rgb(229, 57, 53)');
  });

  it('ignores the transparent corners of a baked-in rounding', () => {
    const data = pixels(20, (x, y) => {
      const corner = (x < 3 || x > 16) && (y < 3 || y > 16);
      return corner ? CLEAR : RED;
    });
    expect(edgeColorOfPixels(data, 20, 20)).toBe('rgb(229, 57, 53)');
  });

  it('keeps the theme background for a glyph on a transparent canvas', () => {
    const data = pixels(20, (x, y) => (x > 2 && x < 17 && y > 2 && y < 17 ? RED : CLEAR));
    expect(edgeColorOfPixels(data, 20, 20)).toBeNull();
  });

  it('does not guess when the edge has no single color', () => {
    const data = pixels(20, (x) => (x < 10 ? RED : BLUE));
    expect(edgeColorOfPixels(data, 20, 20)).toBeNull();
  });

  it('tolerates antialiasing noise of a few levels per channel', () => {
    const data = pixels(20, (x, y) => [0xe5 + ((x + y) % 5), 0x39, 0x35 - ((x * y) % 4), 255]);
    expect(edgeColorOfPixels(data, 20, 20)).not.toBeNull();
  });
});
