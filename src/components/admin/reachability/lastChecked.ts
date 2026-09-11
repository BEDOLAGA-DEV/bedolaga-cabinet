import type { Summary } from '@/api/reachability';

/** Самая свежая проверка по всем хостам и симкам сводки; проверок не было — null. */
export function lastCheckedAt(summary: Summary): string | null {
  return summary.rows
    .flatMap((row) => Object.values(row.cells).map((cell) => cell.checked_at))
    .reduce<string | null>((latest, at) => (latest === null || at > latest ? at : latest), null);
}
