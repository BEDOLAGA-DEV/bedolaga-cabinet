import type { Dpi, Purpose, Summary, Unit } from '@/api/reachability';
import { pickUnits } from './unitSelection';

/**
 * Первый экран раздела — ответ словами по каждому хосту из сводки последних проверок,
 * и набор «Проверить снова» по умолчанию. Чистые функции.
 */

export interface HostAnswer {
  targetKey: string;
  ref: string | null;
  label: string;
  purpose: Purpose;
  /** Симки, у которых сервер открылся, и сколько всего проверяли (без отменённых). */
  ok: number;
  total: number;
  /** Симки, у которых не открылось (op_key). */
  blocked: string[];
  checkedAt: string | null;
}

/** Симки, которыми судят о хосте: под Белый список — с ним, обычный — без, неизвестно — все. */
function relevantDpi(purpose: Purpose): 'on' | 'off' | null {
  return purpose === 'bs' ? 'on' : purpose === 'regular' ? 'off' : null;
}

export function hostAnswers(summary: Summary): HostAnswer[] {
  const dpiOf = new Map(summary.units.map((unit) => [unit.op_key, unit.dpi]));
  return summary.rows.map((row) => {
    const wanted = relevantDpi(row.purpose);
    const cells = Object.entries(row.cells).filter(
      ([key, cell]) =>
        cell.verdict !== 'cancelled' && (wanted === null || (dpiOf.get(key) ?? wanted) === wanted),
    );
    const blocked = cells.filter(([, cell]) => cell.verdict !== 'reachable').map(([key]) => key);
    const checkedAt = cells.reduce<string | null>(
      (latest, [, cell]) =>
        latest === null || cell.checked_at > latest ? cell.checked_at : latest,
      null,
    );
    return {
      targetKey: row.target_key,
      ref: row.ref,
      label: row.label,
      purpose: row.purpose,
      ok: cells.length - blocked.length,
      total: cells.length,
      blocked,
      checkedAt,
    };
  });
}

export interface DefaultProbeSet {
  hosts: string[];
  units: string[];
  dpi: Dpi;
}

/**
 * Что проверять по кнопке «Проверить снова»: хосты под Белый список симками с ним; если таких
 * хостов нет — все хосты панели симками без Белого списка.
 */
export function defaultProbeSet(summary: Summary, catalog: readonly Unit[]): DefaultProbeSet {
  const alive = catalog.filter((unit) => unit.probeable);
  const inPanel = summary.rows.filter((row) => row.in_panel && row.ref);
  const bs = inPanel.filter((row) => row.purpose === 'bs');
  const rows = bs.length > 0 ? bs : inPanel;
  const dpi: Dpi = bs.length > 0 ? 'on' : 'off';
  return {
    hosts: rows.map((row) => row.ref as string),
    units: pickUnits(alive, dpi),
    dpi,
  };
}
