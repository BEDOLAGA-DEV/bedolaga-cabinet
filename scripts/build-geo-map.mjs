#!/usr/bin/env node
/**
 * Собирает данные карты GEO-РФ для вкладки «Доступность → GEO».
 *
 * Вход (пути аргументами, по умолчанию — папка хендоффа бота `.claude/handoffs/geo/`):
 *   1. ru-regions-lite.geojson — контуры 83 субъектов РФ (свойства shapeISO «RU-MOW», name по-русски);
 *      первоисточник — geoBoundaries RUS ADM1 (ODbL, © участники OpenStreetMap), упрощённые контуры.
 *   2. citycoords.json — «region|city» → [lat, lon] для городов пула сервиса bschekbot.
 *   3. nodes.json — города с полями region и iso: отсюда таблица «токен региона → код ISO».
 *
 * Выход — три JSON в src/components/admin/reachability/assets/:
 *   russia-regions.json   — регионы уже в проекции Альберса как SVG-пути + параметры проекции,
 *                           чтобы кабинет клал точки городов той же формулой (geoProjection.ts);
 *   geo-city-coords.json  — координаты городов как есть;
 *   geo-region-iso.json   — токен региона → код на карте (без префикса RU-).
 *
 * Запуск: node scripts/build-geo-map.mjs [geojson] [citycoords] [nodes]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HANDOFF = resolve(
  process.env.HOME ?? '',
  'PycharmProjects/remnawave-bedolaga-telegram-bot/.claude/handoffs/geo',
);
const [geojsonPath, coordsPath, nodesPath] = [
  process.argv[2] ?? resolve(HANDOFF, 'ru-regions-lite.geojson'),
  process.argv[3] ?? resolve(HANDOFF, 'citycoords.json'),
  process.argv[4] ?? resolve(HANDOFF, 'nodes.json'),
];
const OUT = resolve('src/components/admin/reachability/assets');

/** Равновеликая коническая проекция Альберса — та же, что в geoProjection.ts. */
const PROJECTION = { lat1: 52, lat2: 64, lon0: 105 };
const WIDTH = 1000;
const DEG = Math.PI / 180;

function albers({ lat1, lat2, lon0 }) {
  const phi1 = lat1 * DEG;
  const phi2 = lat2 * DEG;
  const n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
  const c = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
  return (lat, lon) => {
    const lambda = (((lon - lon0 + 540) % 360) - 180) * DEG;
    const theta = n * lambda;
    const rho = Math.sqrt(c - 2 * n * Math.sin(lat * DEG)) / n;
    return [rho * Math.sin(theta), rho * Math.cos(theta)];
  };
}

const project = albers(PROJECTION);
const geojson = JSON.parse(readFileSync(geojsonPath, 'utf8'));
const coords = JSON.parse(readFileSync(coordsPath, 'utf8'));
const nodes = JSON.parse(readFileSync(nodesPath, 'utf8'));

const rings = (geometry) =>
  geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat(1);

const projected = geojson.features.map((feature) => ({
  iso: String(feature.properties.shapeISO ?? '').replace(/^RU-/, ''),
  name: String(feature.properties.name ?? feature.properties.shapeName ?? ''),
  rings: rings(feature.geometry).map((ring) => ring.map(([lon, lat]) => project(lat, lon))),
}));

const points = projected.flatMap((region) => region.rings.flat(1));
const minX = Math.min(...points.map((p) => p[0]));
const maxX = Math.max(...points.map((p) => p[0]));
const minY = Math.min(...points.map((p) => p[1]));
const maxY = Math.max(...points.map((p) => p[1]));
const scale = WIDTH / (maxX - minX);
const height = Math.ceil((maxY - minY) * scale);
const toView = ([x, y]) => [((x - minX) * scale).toFixed(1), ((y - minY) * scale).toFixed(1)];

function pathOf(ringsXY) {
  let d = '';
  for (const ring of ringsXY) {
    let last = '';
    ring.forEach((point, index) => {
      const [x, y] = toView(point);
      const key = `${x} ${y}`;
      if (key === last) return;
      d += `${index === 0 ? 'M' : 'L'}${key}`;
      last = key;
    });
    d += 'Z';
  }
  return d;
}

const regions = projected
  .filter((region) => region.iso)
  .map((region) => ({ iso: region.iso, name: region.name, d: pathOf(region.rings) }))
  .sort((a, b) => a.iso.localeCompare(b.iso));

const map = {
  width: WIDTH,
  height,
  projection: { ...PROJECTION, scale, dx: minX, dy: minY },
  probes: { moscow: toView(project(55.7558, 37.6173)).map(Number) },
  regions,
};
writeFileSync(resolve(OUT, 'russia-regions.json'), JSON.stringify(map));

const cityCoords = Object.fromEntries(
  Object.entries(coords).map(([key, [lat, lon]]) => [
    key,
    [Number(lat.toFixed(4)), Number(lon.toFixed(4))],
  ]),
);
writeFileSync(resolve(OUT, 'geo-city-coords.json'), JSON.stringify(cityCoords));

const regionIso = Object.fromEntries(
  nodes
    .filter((node) => node.region && node.iso)
    .map((node) => [node.region, String(node.iso).replace(/^RU-/, '')])
    .sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(resolve(OUT, 'geo-region-iso.json'), `${JSON.stringify(regionIso, null, 2)}\n`);

console.log(
  `regions ${regions.length}, viewBox ${WIDTH}x${height}, cities ${Object.keys(cityCoords).length}, region codes ${Object.keys(regionIso).length}`,
);
const missingIso = regions
  .filter((r) => !Object.values(regionIso).includes(r.iso))
  .map((r) => r.iso);
console.log(`contours without a pool region: ${missingIso.join(', ') || 'none'}`);
