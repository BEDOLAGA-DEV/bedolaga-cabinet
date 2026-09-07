import { type CoreVersions, coreVersion } from './cores';
import type { CellState } from './probeCells';
import type { VlessLegView } from './resultShapes';

/**
 * Ячейки таблицы VLESS-теста — в том же стиле, что таблица проб: точка там, где есть состояние
 * (туннель, цели), моноширинный текст там, где число или код (задержка, ядро, причина).
 * Чистые функции над витриной лега.
 */

export type VlessColumn = 'tunnel' | 'targets' | 'latency' | 'core' | 'reason';

export const VLESS_COLUMNS: readonly VlessColumn[] = [
  'tunnel',
  'targets',
  'latency',
  'core',
  'reason',
];

export interface VlessCell {
  key: VlessColumn;
  /** null — без точки, только текст. */
  state: CellState | null;
  value: string | null;
  /** Цели: по точке на каждый сайт. */
  subs: boolean[] | null;
  /** Подсказка при наведении — диагноз словами. */
  title: string | null;
}

function cell(key: VlessColumn, patch: Partial<VlessCell> = {}): VlessCell {
  return { key, state: null, value: null, subs: null, title: null, ...patch };
}

function tunnelCell(view: VlessLegView): VlessCell {
  if (view.cancelled || view.tunnelUp === null) return cell('tunnel', { state: 'na' });
  return cell('tunnel', { state: view.tunnelUp ? 'ok' : 'down' });
}

function targetsCell(view: VlessLegView): VlessCell {
  if (view.cancelled || view.targets.length === 0) return cell('targets', { state: 'na' });
  const ok = view.targets.filter(Boolean).length;
  const state: CellState = ok === view.targets.length ? 'ok' : ok === 0 ? 'down' : 'warn';
  return cell('targets', { state, value: `${ok}/${view.targets.length}`, subs: [...view.targets] });
}

function latencyCell(view: VlessLegView): VlessCell {
  if (view.cancelled || view.latencyMs === null) return cell('latency');
  return cell('latency', { value: `${Math.round(view.latencyMs)} ms` });
}

function coreCell(view: VlessLegView, cores: CoreVersions): VlessCell {
  if (view.cancelled || !view.core) return cell('core');
  return cell('core', { value: coreVersion(cores, view.core) });
}

function reasonCell(view: VlessLegView): VlessCell {
  return cell('reason', { value: view.failReason, title: view.diagnosis });
}

/** Ячейки лега по столбцам `VLESS_COLUMNS`; отменённый лег — пустые точки и без чисел. */
export function vlessCells(view: VlessLegView, cores: CoreVersions): VlessCell[] {
  return [
    tunnelCell(view),
    targetsCell(view),
    latencyCell(view),
    coreCell(view, cores),
    reasonCell(view),
  ];
}
