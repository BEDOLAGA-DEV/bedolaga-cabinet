import { useTranslation } from 'react-i18next';
import { CloseIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { TONE_DOT, verdictTone } from './geoVerdicts';

export interface TooltipLine {
  verdict: string;
  /** Что справа от слова вердикта: провайдер и задержка у города, число у региона. */
  detail?: string;
}

export interface GeoMapTooltipProps {
  title: string;
  subtitle?: string;
  lines: TooltipLine[];
  /** Пусто в списке — подпись «городов нет» вместо строк. */
  emptyText?: string;
  /** Положение в пикселях относительно контейнера карты и его размер — чтобы не вылезать за край. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Закреплена касанием: ловит указатель и показывает крестик. */
  pinned: boolean;
  onClose: () => void;
}

const OFFSET = 14;
const EDGE = 6;
const MAX_WIDTH = 260;
const ROW_HEIGHT = 22;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * Положение подсказки: справа-снизу от курсора, а у края карты — прижата к краю, не переворачивается
 * за него (на телефоне карта уже подсказки, переворот уводил её за левый край).
 */
export function tooltipPlacement(
  props: Pick<GeoMapTooltipProps, 'x' | 'y' | 'width' | 'height'>,
  lines: number,
): { left: number; top: number; maxWidth: number } {
  const maxWidth = Math.max(120, Math.min(MAX_WIDTH, props.width - EDGE * 2));
  const estimatedHeight = 48 + ROW_HEIGHT * Math.max(1, lines);
  const fitsBelow = props.y + OFFSET + estimatedHeight <= props.height - EDGE;
  const top = fitsBelow ? props.y + OFFSET : props.y - OFFSET - estimatedHeight;
  return {
    left: clamp(props.x + OFFSET, EDGE, Math.max(EDGE, props.width - maxWidth - EDGE)),
    top: clamp(top, EDGE, Math.max(EDGE, props.height - estimatedHeight - EDGE)),
    maxWidth,
  };
}

/** Подсказка карты: город или регион словами; на телефоне закрепляется касанием и закрывается крестиком. */
export function GeoMapTooltip(props: GeoMapTooltipProps) {
  const { t } = useTranslation();
  const style = tooltipPlacement(props, props.lines.length);
  return (
    <div
      role="tooltip"
      style={style}
      className={cn(
        'absolute z-10 rounded-xl border border-dark-700/60 bg-dark-900/95 p-2.5 text-xs shadow-lg backdrop-blur',
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
      {props.lines.length === 0 ? (
        <div className="mt-1 text-dark-400">{props.emptyText}</div>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {props.lines.map((line, index) => (
            <li
              key={`${line.verdict}:${line.detail ?? index}`}
              className="flex items-center gap-1.5 text-dark-200"
            >
              <span
                className={cn(
                  'inline-block h-2 w-2 shrink-0 rounded-full',
                  TONE_DOT[verdictTone(line.verdict)],
                )}
              />
              <span className="truncate">
                {t(`admin.reachability.geo.verdicts.${line.verdict}`, {
                  defaultValue: line.verdict,
                })}
                {line.detail ? ` · ${line.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
