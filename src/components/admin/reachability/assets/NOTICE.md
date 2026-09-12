# Данные карты GEO-РФ

Файлы в этой папке генерируются скриптом `scripts/build-geo-map.mjs`, руками не правятся.

- `russia-regions.json` — контуры 83 субъектов РФ уже в проекции Альберса (параллели 52° и 64°,
  меридиан 105°), как SVG-пути в холсте 1000×545. Первоисточник контуров — geoBoundaries RUS ADM1
  (ODbL, © участники OpenStreetMap), упрощённые контуры из открытой статики bsbord.com/georf
  (`assets/ru-regions-lite.geojson`, свойства `shapeISO`/`name`).
- `geo-city-coords.json` — «токен региона|токен города» → [широта, долгота] для городов пула сервиса
  bschekbot (открытая статика bsbord.com/georf `citycoords.json`). Координаты городов — факты, не
  охраняемый материал.
- `geo-region-iso.json` — токен региона сервиса → код ISO 3166-2 без «RU-» (из `nodes.json` там же).

Исходники на момент сборки лежат в репозитории бота: `.claude/handoffs/geo/`.
