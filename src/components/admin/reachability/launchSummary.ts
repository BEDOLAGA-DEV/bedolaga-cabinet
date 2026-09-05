import type { PreviewResponse } from '@/api/reachability';

/** Сводка для диалога подтверждения перед списанием: что, сколькими симками, за сколько. */
export interface LaunchSummary {
  targets: string[];
  units: string[];
  cost: number | null;
  exact: boolean;
  balanceAfter: number | null;
}

export function launchSummary(preview: PreviewResponse): LaunchSummary {
  const cost = preview.cost_kopeks;
  const balance = preview.balance_kopeks;
  return {
    targets: preview.targets.map((target) => target.label || target.target_key),
    units: [...preview.units_resolved],
    cost,
    exact: preview.estimate_is_exact,
    balanceAfter: cost !== null && balance !== null ? balance - cost : null,
  };
}

/** Первые `max` элементов через запятую, остаток — хвостом вроде «и ещё 3». */
export function formatList(items: string[], max: number, more: (count: number) => string): string {
  const shown = items.slice(0, max).join(', ');
  return items.length > max ? `${shown} ${more(items.length - max)}` : shown;
}
