/**
 * Окно просмотра карты — прямоугольник viewBox в единицах холста. Зум и сдвиг нужны только на
 * телефоне (карта там 330 px шириной): кнопки «+/−», щипок и перетаскивание одним пальцем, когда
 * карта приближена. Точки городов размер не меняют (non-scaling-stroke), меняется только окно.
 */

export interface MapView {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAX_ZOOM = 6;
/** Кнопка «+»/«−» и двойное касание меняют масштаб в столько раз. */
export const ZOOM_STEP = 1.8;
/** Насколько окно может выехать за край холста — чтобы Калининград и Чукотку было удобно подвести к центру. */
const OVERSCROLL = 0.15;

export const fullView = (width: number, height: number): MapView => ({
  x: 0,
  y: 0,
  w: width,
  h: height,
});

export const zoomOf = (view: MapView, width: number): number => width / view.w;

export const viewBoxOf = (view: MapView): string =>
  [view.x, view.y, view.w, view.h].map((n) => Math.round(n * 100) / 100).join(' ');

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/** Окно не шире холста и не уже MAX_ZOOM, в пропорциях холста, с небольшим запасом за краем. */
export function clampView(view: MapView, width: number, height: number): MapView {
  const w = clamp(view.w, width / MAX_ZOOM, width);
  const h = (w * height) / width;
  if (w >= width) return fullView(width, height);
  const padX = w * OVERSCROLL;
  const padY = h * OVERSCROLL;
  return {
    x: clamp(view.x, -padX, width - w + padX),
    y: clamp(view.y, -padY, height - h + padY),
    w,
    h,
  };
}

/** Масштаб в `factor` раз вокруг точки окна (доли 0…1 по ширине и высоте): точка под пальцем стоит на месте. */
export function zoomView(
  view: MapView,
  width: number,
  height: number,
  factor: number,
  anchorX = 0.5,
  anchorY = 0.5,
): MapView {
  const w = clamp(view.w / factor, width / MAX_ZOOM, width);
  const h = (w * height) / width;
  return clampView(
    { x: view.x + (view.w - w) * anchorX, y: view.y + (view.h - h) * anchorY, w, h },
    width,
    height,
  );
}

/** Сдвиг окна на dx, dy единиц холста (палец тянет карту — окно едет в другую сторону). */
export function panView(
  view: MapView,
  dx: number,
  dy: number,
  width: number,
  height: number,
): MapView {
  return clampView({ ...view, x: view.x - dx, y: view.y - dy }, width, height);
}
