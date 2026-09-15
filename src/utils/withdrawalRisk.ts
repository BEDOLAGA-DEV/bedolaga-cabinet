/**
 * Разбор риска заявки на вывод — в строки для людей.
 *
 * Бот (referral_withdrawal_service.analyze_for_money_laundering) кладёт разбивку в
 * `risk_analysis.details`, а экран искал её на верхнем уровне — блоки не рисовались
 * никогда. Когда рисовались бы, показали бы служебные ключи (total_earned), копейки
 * вместо рублей и «[object Object]» вместо списка рефералов.
 */

export interface RiskLabel {
  /** Ключ перевода; если перевода нет — `fallback`. */
  key?: string;
  fallback: string;
}

export interface RiskRow {
  label: RiskLabel;
  /** Сумма в копейках. */
  kopeks?: number;
  count?: number;
  /** Пояснение под строкой: признаки подозрительного реферала, число начислений. */
  note?: string;
  /** Число начислений/пополнений — для пояснения «N шт.». */
  times?: number;
}

export interface RiskSection {
  id: 'balance' | 'deposits' | 'suspicious' | 'earnings' | 'recent';
  titleKey: string;
  rows: RiskRow[];
}

export interface ParsedRisk {
  flags: string[];
  sections: RiskSection[];
}

const NS = 'admin.withdrawals.detail.risk';

const BALANCE_MONEY = [
  'total_earned',
  'own_deposits',
  'spending',
  'referral_spent',
  'withdrawn',
  'pending',
  'available_referral',
  'available_total',
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

function balanceSection(details: Record<string, unknown>): RiskSection | null {
  const stats = asRecord(details.balance_stats);
  if (!stats) return null;
  const rows = BALANCE_MONEY.flatMap((key): RiskRow[] => {
    const kopeks = asNumber(stats[key]);
    return kopeks === undefined
      ? []
      : [{ label: { key: `${NS}.balance.${key}`, fallback: key }, kopeks }];
  });
  return rows.length
    ? { id: 'balance', titleKey: 'admin.withdrawals.detail.balanceStats', rows }
    : null;
}

function depositsSection(details: Record<string, unknown>): RiskSection | null {
  const deposits = asRecord(details.referral_deposits);
  const rows: RiskRow[] = [];
  const referrals = asNumber(details.referral_count);
  if (referrals !== undefined) {
    rows.push({
      label: { key: `${NS}.deposits.referral_count`, fallback: 'referral_count' },
      count: referrals,
    });
  }
  if (deposits) {
    const paying = asNumber(deposits.paying_referrals);
    const total = asNumber(deposits.total_deposits);
    const amount = asNumber(deposits.total_amount);
    if (paying !== undefined) {
      rows.push({
        label: { key: `${NS}.deposits.paying_referrals`, fallback: 'paying_referrals' },
        count: paying,
      });
    }
    if (total !== undefined) {
      rows.push({
        label: { key: `${NS}.deposits.total_deposits`, fallback: 'total_deposits' },
        count: total,
      });
    }
    if (amount !== undefined) {
      rows.push({
        label: { key: `${NS}.deposits.total_amount`, fallback: 'total_amount' },
        kopeks: amount,
      });
    }
  }
  return rows.length
    ? { id: 'deposits', titleKey: 'admin.withdrawals.detail.referralDeposits', rows }
    : null;
}

function suspiciousSection(details: Record<string, unknown>): RiskSection | null {
  const list = Array.isArray(details.suspicious_referrals) ? details.suspicious_referrals : [];
  const rows = list.flatMap((item): RiskRow[] => {
    const entry = asRecord(item);
    if (!entry) return [];
    const flags = Array.isArray(entry.flags)
      ? entry.flags.filter((f) => typeof f === 'string')
      : [];
    return [
      {
        label: { fallback: typeof entry.name === 'string' && entry.name ? entry.name : '—' },
        kopeks: asNumber(entry.deposits_total),
        times: asNumber(entry.deposits_count),
        note: flags.join(', ') || undefined,
      },
    ];
  });
  return rows.length
    ? { id: 'suspicious', titleKey: 'admin.withdrawals.detail.suspiciousReferrals', rows }
    : null;
}

function earningsSection(details: Record<string, unknown>): RiskSection | null {
  const byReason = asRecord(details.earnings_by_reason);
  if (!byReason) return null;
  const rows = Object.entries(byReason).flatMap(([reason, raw]): RiskRow[] => {
    const entry = asRecord(raw);
    if (!entry) return [];
    return [
      {
        label: { key: `referral.reasons.${reason}`, fallback: reason },
        kopeks: asNumber(entry.total),
        times: asNumber(entry.count),
      },
    ];
  });
  return rows.length
    ? { id: 'earnings', titleKey: 'admin.withdrawals.detail.earningsByReason', rows }
    : null;
}

function recentSection(details: Record<string, unknown>): RiskSection | null {
  const recent = asRecord(details.recent_activity);
  if (!recent) return null;
  const count = asNumber(recent.week_earnings_count);
  const amount = asNumber(recent.week_earnings_amount);
  if (count === undefined && amount === undefined) return null;
  return {
    id: 'recent',
    titleKey: `${NS}.recentTitle`,
    rows: [{ label: { key: `${NS}.recent.week`, fallback: 'week' }, kopeks: amount, times: count }],
  };
}

export function parseRiskAnalysis(raw: unknown): ParsedRisk {
  const analysis = asRecord(raw) ?? {};
  // Старые заявки (и рукописные записи) могли держать разбивку на верхнем уровне.
  const details = asRecord(analysis.details) ?? analysis;
  const flags = Array.isArray(analysis.flags)
    ? analysis.flags.filter((flag): flag is string => typeof flag === 'string')
    : [];
  const sections = [
    balanceSection(details),
    depositsSection(details),
    suspiciousSection(details),
    earningsSection(details),
    recentSection(details),
  ].filter((section): section is RiskSection => section !== null);
  return { flags, sections };
}
