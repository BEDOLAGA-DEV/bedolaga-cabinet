import { useTranslation } from 'react-i18next';
import { CloseIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { RecheckButtons } from './RecheckButtons';
import type { TooltipModel, TooltipRow } from './geoMapTooltipModel';
import { TONE_DOT, verdictTone } from './geoVerdicts';

export interface GeoMapTooltipProps extends TooltipModel {
  /** Положение в пикселях относительно контейнера карты и его размер — чтобы не вылезать за край. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Ожидаемая высота — для прижима к краю; считается по строкам моделью. */
  estimatedHeight: number;
  /** Закреплена касанием или кликом: ловит указатель, показывает крестик и кнопки повтора. */
  pinned: boolean;
  onClose: () => void;
}

const OFFSET = 14;
const EDGE = 6;
const MAX_WIDTH = 300;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * Положение подсказки: справа-снизу от курсора, а у края карты — прижата к краю, не переворачивается
 * за него (на телефоне карта уже подсказки, переворот уводил её за левый край).
 */
export function tooltipPlacement(
  props: Pick<GeoMapTooltipProps, 'x' | 'y' | 'width' | 'height'>,
  estimatedHeight: number,
): { left: number; top: number; maxWidth: number } {
  const maxWidth = Math.max(120, Math.min(MAX_WIDTH, props.width - EDGE * 2));
  const fitsBelow = props.y + OFFSET + estimatedHeight <= props.height - EDGE;
  const top = fitsBelow ? props.y + OFFSET : props.y - OFFSET - estimatedHeight;
  return {
    left: clamp(props.x + OFFSET, EDGE, Math.max(EDGE, props.width - maxWidth - EDGE)),
    top: clamp(top, EDGE, Math.max(EDGE, props.height - estimatedHeight - EDGE)),
    maxWidth,
  };
}

function Dot({ verdict, ok }: { verdict?: string; ok?: boolean }) {
  const tone =
    verdict !== undefined ? TONE_DOT[verdictTone(verdict)] : ok ? 'bg-success-400' : 'bg-error-400';
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', tone)} />;
}

function Row({ row, pinned }: { row: TooltipRow; pinned: boolean }) {
  const { t } = useTranslation();
  const KEY = 'admin.reachability.geo';
  const verdict = t(`${KEY}.verdicts.${row.verdict}`, { defaultValue: row.verdict });
  const latency =
    row.latencyMs === null ? null : t(`${KEY}.rows.latency`, { value: row.latencyMs });
  return (
    <li className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <Dot verdict={row.verdict} />
        <span className="min-w-0 truncate">
          {row.name && <span className="font-medium text-dark-100">{row.name} </span>}
          <span className={cn(row.name ? 'text-dark-300' : 'text-dark-200')}>
            {[verdict, row.provider, latency].filter(Boolean).join(' · ')}
          </span>
        </span>
      </div>
      {row.exitIp && (
        <div className="pl-3.5 font-mono text-[11px] text-dark-300">
          {row.exitIp}
          {row.newExit && (
            <span className="ml-1.5 font-sans text-dark-400">{t(`${KEY}.rows.tags.newExit`)}</span>
          )}
          {row.exitChanged && (
            <span className="ml-1.5 font-sans text-warning-400">
              {t(`${KEY}.rows.tags.exitChanged`)}
            </span>
          )}
        </div>
      )}
      {row.checks.length > 0 && (
        <ul className="space-y-0.5 pl-3.5">
          {row.checks.map((check) => (
            <li key={check.name} className="flex items-center gap-1.5 text-dark-300">
              <Dot ok={check.ok} />
              <span className="min-w-0 flex-1 truncate">{check.name}</span>
              <span className="shrink-0 tabular-nums text-dark-400">
                {check.ms === null ? '—' : t(`${KEY}.rows.latency`, { value: check.ms })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {pinned && row.recheck && (
        <RecheckButtons
          job={row.recheck.job}
          row={row.recheck.row}
          state={row.recheck.state}
          onStart={row.recheck.onStart}
          className="pl-3.5 pt-1"
        />
      )}
    </li>
  );
}

/**
 * Подсказка карты как у оригинала: город или регион, по строке на наблюдение — вердикт, провайдер,
 * задержка, выход, подпроверки; закреплённая — с крестиком и кнопками «Тот же IP» / «Сменить IP».
 */
export function GeoMapTooltip(props: GeoMapTooltipProps) {
  const { t } = useTranslation();
  const style = tooltipPlacement(props, props.estimatedHeight);
  return (
    <div
      role="tooltip"
      style={style}
      className={cn(
        'absolute z-10 w-max rounded-xl border border-dark-700/60 bg-dark-900/95 p-2.5 text-xs shadow-lg backdrop-blur',
        props.pinned ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-dark-100">{props.title}</div>
          {props.subtitle && <div className="truncate text-dark-400">{props.subtitle}</div>}
        </div>
        {props.pinned && (
          <button
            type="button"
            onClick={props.onClose}
            aria-label={t('admin.reachability.geo.map.close')}
            className="-mr-1 -mt-1 rounded-md p-1 text-dark-400 hover:text-dark-100"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {props.rows.length === 0 ? (
        <div className="mt-1 text-dark-400">{props.emptyText}</div>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {props.rows.map((row) => (
            <Row key={row.key} row={row} pinned={props.pinned} />
          ))}
        </ul>
      )}
      {props.moreCount > 0 && (
        <div className="mt-1 text-dark-400">
          {t('admin.reachability.geo.map.more', { count: props.moreCount })}
        </div>
      )}
    </div>
  );
}
