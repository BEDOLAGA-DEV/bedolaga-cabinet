// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import ruLocale from '@/locales/ru.json';

/**
 * Раздел «Вывод средств» на странице рефералов.
 *
 * Когда вывод выключен, сервер обнуляет всю статистику и присылает служебную
 * фразу «Функция вывода реферального баланса отключена». Кабинет рисовал по ней
 * целую карточку с пятью нулями и навсегда серой кнопкой — бот в этом же случае
 * просто не показывает кнопку.
 *
 * Здесь держится, что выключённый вывод не занимает место, но уже поданные
 * заявки остаются видны: деньги в обработке не должны исчезать со страницы
 * вместе с разделом.
 */

function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const template = resolveRu(key);
      if (!template) return key;
      return template.replace(/{{(\w+)}}/g, (_match, name) => String(options?.[name] ?? ''));
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const DISABLED_REASON = 'Функция вывода реферального баланса отключена';

const state = {
  withdrawalEnabled: true,
  history: [] as Record<string, unknown>[],
};

/** Ровно то, что отдаёт бот при выключенном выводе: нули и служебная причина. */
const balance = () => ({
  total_earned: 0,
  referral_spent: 0,
  withdrawn: 0,
  pending: 0,
  available_referral: 0,
  available_total: 0,
  only_referral_mode: false,
  min_amount_kopeks: 100000,
  is_withdrawal_enabled: state.withdrawalEnabled,
  can_request: state.withdrawalEnabled,
  cannot_request_reason: state.withdrawalEnabled ? null : DISABLED_REASON,
  requisites_text: '',
});

vi.mock('@/api/referral', () => ({
  referralApi: {
    getReferralInfo: () =>
      Promise.resolve({
        referral_code: 'ABC',
        referral_link: 'https://example.org/r/ABC',
        bot_referral_link: '',
        total_referrals: 0,
        active_referrals: 0,
        total_earnings_kopeks: 0,
        total_earnings_rubles: 0,
        commission_percent: 0,
        available_balance_kopeks: 0,
        available_balance_rubles: 0,
        withdrawn_kopeks: 0,
      }),
    getReferralList: () =>
      Promise.resolve({ items: [], total: 0, page: 1, per_page: 20, pages: 1 }),
    getReferralEarnings: () =>
      Promise.resolve({
        items: [],
        total: 0,
        total_amount_kopeks: 0,
        total_amount_rubles: 0,
        total_days_granted: 0,
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
        partner_section_visible: true,
      }),
  },
}));

vi.mock('@/api/partners', () => ({
  partnerApi: { getStatus: () => Promise.resolve({ partner_status: 'none' }) },
}));

vi.mock('@/api/branding', () => ({
  brandingApi: { getBranding: () => Promise.resolve({}) },
}));

vi.mock('@/api/withdrawals', () => ({
  withdrawalApi: {
    getBalance: () => Promise.resolve(balance()),
    getHistory: () => Promise.resolve({ items: state.history, total: state.history.length }),
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
  state.withdrawalEnabled = true;
  state.history = [];
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

describe('вывод средств выключен', () => {
  it('не показывает ни карточку, ни серую кнопку, ни служебную причину', async () => {
    state.withdrawalEnabled = false;
    await renderReferral();

    // Дожидаемся отрисовки страницы, чтобы отсутствие раздела не оказалось
    // просто незагруженной страницей.
    await screen.findByText(resolveRu('referral.yourLink') ?? 'referral.yourLink');

    await waitFor(() => {
      expect(screen.queryByText(DISABLED_REASON)).toBeNull();
    });
    expect(screen.queryByText(resolveRu('referral.withdrawal.title') as string)).toBeNull();
    expect(screen.queryByText(resolveRu('referral.withdrawal.requestButton') as string)).toBeNull();
    expect(screen.queryByText(resolveRu('referral.withdrawal.history') as string)).toBeNull();
  });

  it('оставляет на виду заявки, поданные до выключения', async () => {
    state.withdrawalEnabled = false;
    state.history = [
      {
        id: 1,
        amount_kopeks: 150000,
        amount_rubles: 1500,
        status: 'pending',
        payment_details: null,
        admin_comment: null,
        created_at: '2026-01-01T00:00:00Z',
        processed_at: null,
      },
    ];
    await renderReferral();

    expect(
      await screen.findByText(resolveRu('referral.withdrawal.history') as string),
    ).toBeTruthy();
    // Нулевая статистика при этом всё равно не показывается — она выдумана сервером.
    expect(screen.queryByText(resolveRu('referral.withdrawal.available') as string)).toBeNull();
  });
});

describe('приглашение в партнёры', () => {
  it('не обещает вывод заработка, когда вывод выключен', async () => {
    state.withdrawalEnabled = false;
    await renderReferral();

    const cta = await screen.findByText(
      resolveRu('referral.partner.becomePartnerDescNoWithdrawal') as string,
    );
    expect(cta).toBeTruthy();
    expect(
      screen.queryByText(resolveRu('referral.partner.becomePartnerDesc') as string),
    ).toBeNull();
  });

  it('обещает вывод, когда он работает', async () => {
    await renderReferral();

    expect(
      await screen.findByText(resolveRu('referral.partner.becomePartnerDesc') as string),
    ).toBeTruthy();
  });
});

describe('вывод средств включён', () => {
  it('показывает раздел как прежде', async () => {
    await renderReferral();

    expect(await screen.findByText(resolveRu('referral.withdrawal.title') as string)).toBeTruthy();
    expect(screen.getByText(resolveRu('referral.withdrawal.requestButton') as string)).toBeTruthy();
    expect(screen.getByText(resolveRu('referral.withdrawal.history') as string)).toBeTruthy();
  });
});
