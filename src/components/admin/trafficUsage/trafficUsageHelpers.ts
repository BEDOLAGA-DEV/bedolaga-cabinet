import type { RowData } from '@tanstack/react-table';
import { getFlagEmoji as _sharedGetFlagEmoji } from '../../../utils/subscriptionHelpers';
import type { UserTrafficItem } from '../../../api/adminTraffic';

// ──────────────────────────────────────────────────────────────────
// TanStack Table module augmentation — shared by the AdminTrafficUsage
// column defs (sticky / align / bold per-column meta).
// ──────────────────────────────────────────────────────────────────

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    sticky?: boolean;
    align?: 'left' | 'center';
    bold?: boolean;
  }
}

// ──────────────────────────────────────────────────────────────────
// Formatters
// ──────────────────────────────────────────────────────────────────

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Local wrapper over the shared helper so internal call sites keep
// the (string) signature.
export const getFlagEmoji = (countryCode: string): string => _sharedGetFlagEmoji(countryCode);

export const formatCurrency = (kopeks: number): string => {
  const rubles = kopeks / 100;
  if (rubles === 0) return '0';
  if (rubles < 10) return rubles.toFixed(2);
  if (rubles < 1000) return Math.round(rubles).toString();
  return `${(rubles / 1000).toFixed(1)}k`;
};

export const formatShortDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
};

export const toBackendSortField = (columnId: string): string => {
  if (columnId === 'user') return 'full_name';
  return columnId;
};

// ──────────────────────────────────────────────────────────────────
// Risk assessment
// ──────────────────────────────────────────────────────────────────

export const bytesToGbPerDay = (bytes: number, days: number): number =>
  days > 0 ? bytes / days / 1024 ** 3 : 0;

export const getRatio = (gbPerDay: number, threshold: number): number =>
  threshold > 0 ? gbPerDay / threshold : 0;

export const getRowBgColor = (ratio: number): string | undefined => {
  if (ratio <= 0) return undefined;
  const clamped = Math.min(ratio, 1.5);
  const hue = 120 - Math.min(clamped, 1) * 120;
  const opacity = clamped <= 1 ? 0.06 + clamped * 0.07 : 0.13 + (clamped - 1) * 0.14;
  return `hsla(${hue}, 70%, 45%, ${opacity})`;
};

export const getNodeTextColor = (ratio: number): string => {
  const clamped = Math.min(Math.max(ratio, 0), 1.5);
  let hue: number;
  if (clamped <= 0.7) {
    hue = 210 - (clamped / 0.7) * 180; // 210 (blue) → 30 (amber)
  } else {
    hue = Math.max(0, 30 - ((clamped - 0.7) / 0.8) * 30); // 30 (amber) → 0 (red)
  }
  const saturation = 70 + clamped * 15;
  const lightness = 65 - clamped * 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const getRiskLevel = (ratio: number): RiskLevel => {
  if (ratio < 0.5) return 'low';
  if (ratio < 0.8) return 'medium';
  if (ratio < 1.2) return 'high';
  return 'critical';
};

export interface RiskResult {
  ratio: number;
  gbPerDay: number; // the dominant daily value (total or worst node)
  totalRatio: number;
  maxNodeRatio: number;
}

export const getCompositeRisk = (
  row: UserTrafficItem,
  totalThreshold: number,
  nodeThreshold: number,
  days: number,
): RiskResult => {
  const dailyTotal = bytesToGbPerDay(row.total_bytes, days);
  const totalR = totalThreshold > 0 ? getRatio(dailyTotal, totalThreshold) : 0;

  let maxNodeR = 0;
  let worstNodeGbPerDay = 0;
  if (nodeThreshold > 0) {
    for (const b of Object.values(row.node_traffic)) {
      const daily = bytesToGbPerDay(b || 0, days);
      const r = getRatio(daily, nodeThreshold);
      if (r > maxNodeR) {
        maxNodeR = r;
        worstNodeGbPerDay = daily;
      }
    }
  }

  // The dominant metric determines what GB/d we show
  const ratio = Math.max(totalR, maxNodeR);
  const gbPerDay = totalR >= maxNodeR ? dailyTotal : worstNodeGbPerDay;

  return { ratio, gbPerDay, totalRatio: totalR, maxNodeRatio: maxNodeR };
};

export const RISK_STYLES: Record<
  RiskLevel,
  { dot: string; text: string; bar: string; bg: string }
> = {
  low: {
    dot: 'bg-success-400',
    text: 'text-success-400',
    bar: 'bg-success-400',
    bg: 'bg-success-400/10',
  },
  medium: {
    dot: 'bg-warning-400',
    text: 'text-warning-400',
    bar: 'bg-warning-400',
    bg: 'bg-warning-400/10',
  },
  high: {
    dot: 'bg-warning-400',
    text: 'text-warning-400',
    bar: 'bg-warning-400',
    bg: 'bg-warning-400/10',
  },
  critical: {
    dot: 'bg-error-400 animate-pulse',
    text: 'text-error-400',
    bar: 'bg-error-400',
    bg: 'bg-error-400/10',
  },
};

export const formatGbPerDay = (gbPerDay: number): string => {
  if (gbPerDay < 0.01) return '<0.01';
  if (gbPerDay < 10) return gbPerDay.toFixed(2);
  if (gbPerDay < 100) return gbPerDay.toFixed(1);
  return Math.round(gbPerDay).toString();
};
