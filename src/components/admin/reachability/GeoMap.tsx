import { type MouseEvent, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import svgSource from './assets/russia-regions.svg?raw';
import { regionCodeFor } from './geoRegions';
import { GEO_VERDICTS, type GeoTone, TONE_DOT, regionTone, verdictTone } from './geoVerdicts';

export interface GeoMapRow {
  region_ru: string;
  city_ru: string;
  verdict: string;
}

export interface GeoMapProps {
  rows: readonly GeoMapRow[];
  selected: string | null;
  onSelect: (code: string | null) => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function groupByRegion<T>(
  rows: readonly GeoMapRow[],
  pick: (row: GeoMapRow) => T,
): Map<string, T[]> {
  const byCode = new Map<string, T[]>();
  for (const row of rows) {
    const code = regionCodeFor(row.region_ru);
    if (!code) continue;
    byCode.set(code, [...(byCode.get(code) ?? []), pick(row)]);
  }
  return byCode;
}

/** Код региона → тон по худшему результату его городов; регион вне таблицы кодов — мимо. */
export function regionFills(rows: readonly GeoMapRow[]): Record<string, GeoTone> {
  return Object.fromEntries(
    [...groupByRegion(rows, (row) => row)].map(([code, list]) => [code, regionTone(list)]),
  );
}

/**
 * Цвета регионов, стран и контуров — только через атрибуты и варианты Tailwind: в самом SVG
 * заливок нет (см. NOTICE), поэтому классы контейнера красят всё без `!important`.
 */
const MAP_STYLES = cn(
  'w-full overflow-hidden rounded-2xl border border-dark-700/60 bg-dark-900/40 [&>svg]:h-auto [&>svg]:w-full',
  '[&_[data-layer=countries]]:fill-dark-800/70 [&_[data-layer=countries]]:stroke-dark-700',
  '[&_[data-layer=borders]]:fill-none [&_[data-layer=borders]]:stroke-dark-600 [&_[data-layer=borders]]:stroke-[0.6]',
  '[&_[data-layer=districts]]:fill-none [&_[data-layer=districts]]:stroke-dark-500 [&_[data-layer=districts]]:stroke-[0.8]',
  '[&_[data-region]]:cursor-pointer [&_[data-region]]:stroke-dark-900 [&_[data-region]]:stroke-[0.5] [&_[data-region]]:transition-colors',
  '[&_[data-tone=empty]]:fill-dark-700 [&_[data-tone=na]]:fill-dark-500',
  '[&_[data-tone=ok]]:fill-success-400/80 [&_[data-tone=warn]]:fill-warning-400/80 [&_[data-tone=orange]]:fill-orange-400/80',
  '[&_[data-tone=down]]:fill-error-400/80 [&_[data-tone=violet]]:fill-violet-400/80 [&_[data-tone=blue]]:fill-sky-400/80',
  '[&_[data-selected=true]]:stroke-accent-400 [&_[data-selected=true]]:stroke-[1.5]',
);

function setTitle(element: Element, text: string | undefined): void {
  const existing = element.querySelector<SVGTitleElement>(':scope > title');
  if (!text) {
    existing?.remove();
    return;
  }
  const title = existing ?? element.appendChild(document.createElementNS(SVG_NS, 'title'));
  title.textContent = text;
}

/**
 * Карта регионов как у dpichecker: SVG «ISO codes of subjects of Russia», регион красится целиком
 * по худшему результату его городов. Наведение — города и вердикты словами; нажатие — фильтр
 * списка (повторное снимает).
 */
export function GeoMap({ rows, selected, onSelect }: GeoMapProps) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const fills = useMemo(() => regionFills(rows), [rows]);
  const titles = useMemo(
    () =>
      groupByRegion(
        rows,
        (row) =>
          `${row.city_ru}: ${t(`admin.reachability.geo.verdicts.${row.verdict}`, { defaultValue: row.verdict })}`,
      ),
    [rows, t],
  );

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    for (const element of root.querySelectorAll<SVGElement>('[data-region]')) {
      const code = element.dataset.region ?? '';
      element.setAttribute('data-tone', fills[code] ?? 'empty');
      element.setAttribute('data-selected', String(selected === code));
      setTitle(element, titles.get(code)?.join('\n'));
    }
  }, [fills, titles, selected]);

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const region = (event.target as Element).closest<SVGElement>('[data-region]');
    const code = region?.dataset.region;
    if (!code) return;
    onSelect(selected === code ? null : code);
  };

  return (
    <figure className="space-y-2">
      <div
        ref={host}
        className={MAP_STYLES}
        onClick={onClick}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: статический ресурс из репозитория (см. NOTICE), не пользовательский ввод
        dangerouslySetInnerHTML={{ __html: svgSource }}
      />
      <figcaption className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-dark-400">
        {GEO_VERDICTS.map((verdict) => (
          <span key={verdict} className="inline-flex items-center gap-1">
            <span
              className={cn('inline-block h-2 w-2 rounded-full', TONE_DOT[verdictTone(verdict)])}
            />
            {t(`admin.reachability.geo.verdicts.${verdict}`)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
