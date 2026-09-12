/**
 * Равновеликая коническая проекция Альберса — ровно та, которой `scripts/build-geo-map.mjs`
 * перевёл контуры регионов в SVG-пути. Параметры (параллели, меридиан, масштаб, сдвиг) лежат
 * рядом с контурами в `assets/russia-regions.json`, поэтому точка города, спроецированная здесь,
 * ложится на тот же холст, что и регион.
 */

export interface AlbersParams {
  lat1: number;
  lat2: number;
  lon0: number;
  scale: number;
  dx: number;
  dy: number;
}

const DEG = Math.PI / 180;

/** Широта и долгота → координаты холста карты (x вправо, y вниз, в единицах viewBox). */
export function projectPoint(params: AlbersParams, lat: number, lon: number): [number, number] {
  const phi1 = params.lat1 * DEG;
  const phi2 = params.lat2 * DEG;
  const n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
  const c = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
  // Долгота относительно центрального меридиана, свёрнутая в −180…180: Чукотка за 180° не рвётся.
  const lambda = (((lon - params.lon0 + 540) % 360) - 180) * DEG;
  const theta = n * lambda;
  const rho = Math.sqrt(c - 2 * n * Math.sin(lat * DEG)) / n;
  return [
    (rho * Math.sin(theta) - params.dx) * params.scale,
    (rho * Math.cos(theta) - params.dy) * params.scale,
  ];
}
