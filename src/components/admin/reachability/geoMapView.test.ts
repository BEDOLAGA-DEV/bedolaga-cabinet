import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, clampView, fullView, panView, viewBoxOf, zoomOf, zoomView } from './geoMapView';

const W = 1000;
const H = 500;

describe('geoMapView', () => {
  it('полный вид — весь холст; масштаб 1', () => {
    const full = fullView(W, H);
    expect(viewBoxOf(full)).toBe('0 0 1000 500');
    expect(zoomOf(full, W)).toBe(1);
  });
  it('приближение вокруг точки: точка под пальцем остаётся на месте', () => {
    const zoomed = zoomView(fullView(W, H), W, H, 2, 0.25, 0.5);
    expect(zoomed.w).toBe(500);
    expect(zoomed.h).toBe(250);
    // Точка (250, 250) холста: до — на 25 % ширины и 50 % высоты окна, после — там же.
    expect((250 - zoomed.x) / zoomed.w).toBeCloseTo(0.25);
    expect((250 - zoomed.y) / zoomed.h).toBeCloseTo(0.5);
    expect(zoomOf(zoomed, W)).toBe(2);
  });
  it('дальше MAX_ZOOM не приближает, дальше полного вида не отдаляет', () => {
    const tight = zoomView(fullView(W, H), W, H, 100);
    expect(zoomOf(tight, W)).toBe(MAX_ZOOM);
    expect(zoomView(tight, W, H, 0.001)).toEqual(fullView(W, H));
  });
  it('сдвиг: палец тянет карту вправо — окно едет влево; за край не дальше запаса', () => {
    const zoomed = zoomView(fullView(W, H), W, H, 2);
    const moved = panView(zoomed, 100, 0, W, H);
    expect(moved.x).toBe(zoomed.x - 100);
    const far = panView(zoomed, 10_000, 10_000, W, H);
    expect(far.x).toBeCloseTo(-zoomed.w * 0.15);
    expect(far.y).toBeCloseTo(-zoomed.h * 0.15);
    const other = panView(zoomed, -10_000, -10_000, W, H);
    expect(other.x).toBeCloseTo(W - zoomed.w + zoomed.w * 0.15);
  });
  it('clampView держит пропорции холста', () => {
    const odd = clampView({ x: 0, y: 0, w: 400, h: 400 }, W, H);
    expect(odd.h).toBe(200);
  });
});
