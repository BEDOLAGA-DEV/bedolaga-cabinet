import { describe, expect, it } from 'vitest';

import { parseRiskAnalysis } from './withdrawalRisk';

/** Форма, которую пишет бот: разбивка внутри details. */
const BOT_ANALYSIS = {
  risk_score: 45,
  risk_level: 'medium',
  recommendation: 'review',
  flags: ['⚠️ Весь доход от одного реферала'],
  details: {
    balance_stats: {
      total_earned: 123456,
      own_deposits: 0,
      spending: 5000,
      referral_spent: 5000,
      withdrawn: 0,
      pending: 100000,
      available_referral: 18456,
      available_total: 18456,
      only_referral_mode: true,
    },
    referral_count: 3,
    suspicious_referrals: [
      {
        name: 'Иван',
        deposits_count: 12,
        deposits_total: 900000,
        flags: ['12 пополнений/мес', 'сумма 9000₽'],
      },
    ],
    referral_deposits: { paying_referrals: 1, total_deposits: 14, total_amount: 950000 },
    earnings_by_reason: { referral_commission_topup: { count: 14, total: 123456 } },
    recent_activity: { week_earnings_count: 25, week_earnings_amount: 40000 },
  },
};

describe('parseRiskAnalysis', () => {
  it('читает разбивку из details, как её пишет бот', () => {
    const { flags, sections } = parseRiskAnalysis(BOT_ANALYSIS);

    expect(flags).toEqual(['⚠️ Весь доход от одного реферала']);
    expect(sections.map((s) => s.id)).toEqual([
      'balance',
      'deposits',
      'suspicious',
      'earnings',
      'recent',
    ]);
  });

  it('суммы остаются копейками для форматирования, служебный флаг режима не выводится', () => {
    const balance = parseRiskAnalysis(BOT_ANALYSIS).sections[0];

    expect(balance.rows).toHaveLength(8);
    expect(balance.rows[0]).toEqual({
      label: {
        key: 'admin.withdrawals.detail.risk.balance.total_earned',
        fallback: 'total_earned',
      },
      kopeks: 123456,
    });
  });

  it('подозрительный реферал — строкой с именем, суммой и признаками, а не [object Object]', () => {
    const suspicious = parseRiskAnalysis(BOT_ANALYSIS).sections.find((s) => s.id === 'suspicious');

    expect(suspicious?.rows).toEqual([
      {
        label: { fallback: 'Иван' },
        kopeks: 900000,
        times: 12,
        note: '12 пополнений/мес, сумма 9000₽',
      },
    ]);
  });

  it('начисления по причинам — подпись из переводов реферальной программы', () => {
    const earnings = parseRiskAnalysis(BOT_ANALYSIS).sections.find((s) => s.id === 'earnings');

    expect(earnings?.rows[0]).toEqual({
      label: {
        key: 'referral.reasons.referral_commission_topup',
        fallback: 'referral_commission_topup',
      },
      kopeks: 123456,
      times: 14,
    });
  });

  it('старая форма без details тоже читается', () => {
    const { sections } = parseRiskAnalysis({ flags: [], balance_stats: { total_earned: 100 } });

    expect(sections.map((s) => s.id)).toEqual(['balance']);
  });

  it('пусто и мусор — без разделов и без падения', () => {
    expect(parseRiskAnalysis(null)).toEqual({ flags: [], sections: [] });
    expect(
      parseRiskAnalysis({ details: { suspicious_referrals: 'x', balance_stats: [] } }),
    ).toEqual({
      flags: [],
      sections: [],
    });
  });
});
