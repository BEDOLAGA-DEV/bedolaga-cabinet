// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { ReferralEarning } from '@/api/referral';

/**
 * A referral reward can be paid in subscription days instead of money. Days are
 * recorded with amount_kopeks = 0 by design — they must never leak into the money
 * total, which is what the withdrawable balance is computed from — so a page that
 * formats a row by its money amount alone prints "+0.00 ₽" for a real +7 days.
 *
 * These tests hold that contract and the level badge, not the layout: they break
 * only if a days reward stops being named or a deep-level row becomes
 * indistinguishable from a direct one.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const templates: Record<string, string> = {
        'referral.days': '{{count}} дн.',
        'referral.daysWithTariff': '{{count}} дн. «{{tariff}}»',
        'referral.levelBadge': 'уровень {{count}}',
        'referral.stats.earnedDays': '{{count}} дн. подписки',
        'referral.terms.noLevels': 'Уровни наград ещё не настроены',
      };
      const template = templates[key];
      if (!template) return key;
      return template.replace(/{{(\w+)}}/g, (_match, name) => String(options?.[name] ?? ''));
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const earning = (overrides: Partial<ReferralEarning>): ReferralEarning => ({
  id: 1,
  amount_kopeks: 0,
  amount_rubles: 0,
  reason: 'referral_days_reward',
  referral_username: 'ivan',
  referral_first_name: 'Иван',
  campaign_name: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const state = {
  earnings: [] as ReferralEarning[],
  terms: {} as Record<string, unknown>,
  info: {} as Record<string, unknown>,
};

vi.mock('@/api/referral', () => ({
  referralApi: {
    getReferralInfo: () =>
      Promise.resolve({
        referral_code: 'ABC',
        referral_link: 'https://example.org/r/ABC',
        bot_referral_link: '',
        total_referrals: 3,
        active_referrals: 1,
        total_earnings_kopeks: 0,
        total_earnings_rubles: 0,
        commission_percent: 0,
        available_balance_kopeks: 0,
        available_balance_rubles: 0,
        withdrawn_kopeks: 0,
        ...state.info,
      }),
    getReferralList: () =>
      Promise.resolve({ items: [], total: 0, page: 1, per_page: 20, pages: 1 }),
    getReferralEarnings: () =>
      Promise.resolve({
        items: state.earnings,
        total: state.earnings.length,
        total_amount_kopeks: 0,
        total_amount_rubles: 0,
        total_days_granted: 7,
        page: 1,
        per_page: 20,
        pages: 1,
      }),
    getReferralTerms: () =>
      Promise.resolve({
        is_enabled: true,
        commission_percent: 0,
        minimum_topup_kopeks: 0,
        minimum_topup_rubles: 0,
        first_topup_bonus_kopeks: 0,
        first_topup_bonus_rubles: 0,
        inviter_bonus_kopeks: 0,
        inviter_bonus_rubles: 0,
        max_commission_payments: 0,
        partner_section_visible: false,
        ...state.terms,
      }),
  },
}));

vi.mock('@/api/partner', () => ({
  partnerApi: { getStatus: () => Promise.resolve({ partner_status: 'none' }) },
}));

vi.mock('@/api/branding', () => ({
  brandingApi: { getBranding: () => Promise.resolve({}) },
}));

vi.mock('@/api/withdrawal', () => ({
  withdrawalApi: {
    getBalance: () => Promise.resolve({}),
    getHistory: () => Promise.resolve({ items: [] }),
    cancel: () => Promise.resolve(),
  },
}));

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

(globalThis as Record<string, unknown>).__APP_VERSION__ ??= '0.0.0-test';

afterEach(() => {
  cleanup();
  state.earnings = [];
  state.terms = {};
  state.info = {};
});

async function renderReferral() {
  const Referral = (await import('./Referral')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/referral']}>
          <Referral />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

describe('награды днями в истории начислений', () => {
  it('называются днями, а не нулём рублей', async () => {
    state.earnings = [earning({ days_granted: 7, reward_type: 'days' })];
    await renderReferral();

    // Проверяется именно строка истории: денежная карточка сверху имеет полное
    // право показывать нулевую сумму — дни в неё и не должны попадать.
    const row = await screen.findByText(/7 дн\./);
    expect(row.textContent).toMatch(/\+7 дн\./);
    expect(row.textContent).not.toMatch(/0[.,]00/);
  });

  it('называют тариф, в который легли дни', async () => {
    state.earnings = [earning({ days_granted: 7, reward_type: 'days', tariff_name: 'Про' })];
    await renderReferral();

    expect(await screen.findByText(/«Про»/)).toBeTruthy();
  });

  it('показывают и деньги, и дни, когда начислено оба', async () => {
    state.earnings = [
      earning({ amount_kopeks: 25000, amount_rubles: 250, days_granted: 3, reward_type: 'days' }),
    ];
    await renderReferral();

    const row = await screen.findByText(/3 дн\./);
    expect(row.textContent).toMatch(/250/);
  });
});

describe('уровень цепочки', () => {
  it('помечается на строках глубже первой', async () => {
    state.earnings = [earning({ days_granted: 5, level: 2 })];
    await renderReferral();

    expect(await screen.findByText(/уровень 2/)).toBeTruthy();
  });

  it('не засоряет строки первого уровня', async () => {
    state.earnings = [earning({ days_granted: 5, level: 1 })];
    await renderReferral();

    await screen.findByText(/5 дн\./);
    expect(screen.queryByText(/уровень 1/)).toBeNull();
  });
});

describe('условия программы под многоуровневой схемой', () => {
  it('печатают правила уровней вместо плоских настроек', async () => {
    state.terms = {
      scheme: 'levels',
      level_descriptions: ['Уровень 1: 10% от суммы с каждого пополнения'],
      max_level_depth: 3,
    };
    await renderReferral();

    expect(await screen.findByText(/Уровень 1: 10% от суммы/)).toBeTruthy();
  });

  it('честно сообщают, что уровни не настроены', async () => {
    state.terms = { scheme: 'levels', level_descriptions: [], max_level_depth: 3 };
    await renderReferral();

    expect(await screen.findByText(/Уровни наград ещё не настроены/)).toBeTruthy();
  });
});
