import type { Summary, SummaryRow } from '@/api/reachability';

/** Полоска входа: сколько хостов под Белым списком в норме по последним легам симок с БС. */
export interface HostsHealth {
  total: number;
  ok: number;
  failing: number;
  unchecked: number;
  lastCheckedAt: string | null;
}

function rowVerdict(row: SummaryRow): 'ok' | 'failing' | 'unchecked' {
  const cells = Object.values(row.cells);
  if (cells.length === 0) return 'unchecked';
  return cells.every((cell) => cell.matches_expectation === true) ? 'ok' : 'failing';
}

export function hostsHealth(summary: Summary): HostsHealth {
  const rows = summary.rows.filter((row) => row.purpose === 'bs');
  const counts = { ok: 0, failing: 0, unchecked: 0 };
  let lastCheckedAt: string | null = null;
  for (const row of rows) {
    counts[rowVerdict(row)] += 1;
    for (const cell of Object.values(row.cells)) {
      if (lastCheckedAt === null || cell.checked_at > lastCheckedAt)
        lastCheckedAt = cell.checked_at;
    }
  }
  return { total: rows.length, ...counts, lastCheckedAt };
}
