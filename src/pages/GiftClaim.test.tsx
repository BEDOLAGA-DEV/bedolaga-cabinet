// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseStatus } from '@/api/landings';
import GiftClaim from './GiftClaim';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

const getGiftClaimMock = vi.fn();
const claimGiftMock = vi.fn();

vi.mock('@/api/landings', () => ({
  landingApi: {
    getGiftClaim: (token: string) => getGiftClaimMock(token),
    claimGift: (token: string, email: string) => claimGiftMock(token, email),
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

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

function renderGiftClaim(token = 'test_gift_token_123') {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/buy/gift/${token}`]}>
        <Routes>
          <Route path="/buy/gift/:token" element={<GiftClaim />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const CANONICAL_BOT_URL = 'https://t.me/BedolagaBot?start=GIFT_canonical_12345';
const LEGACY_BOT_LINK = 'https://t.me/BedolagaBot?start=legacy_12345';

describe('GiftClaim canonical vs legacy link selection', () => {
  it('предпочитает canonical bot_claim_url при одновременном наличии legacy aliases', async () => {
    const status: PurchaseStatus = {
      status: 'paid',
      is_gift: true,
      is_claimable: true,
      tariff_name: 'VIP Tariff',
      period_days: 30,
      contact_type: null,
      recipient_contact_value: null,
      subscription_url: null,
      subscription_crypto_link: null,
      cabinet_email: null,
      cabinet_password: null,
      auto_login_token: null,
      contact_value: null,
      gift_message: 'Enjoy your VPN!',
      recipient_in_bot: null,
      bot_link: null,
      claim_url: 'https://cab.example/gift/legacy',
      bot_claim_link: LEGACY_BOT_LINK,
      cabinet_claim_url: 'https://cab.example/buy/gift/canonical',
      bot_claim_url: CANONICAL_BOT_URL,
    };

    getGiftClaimMock.mockResolvedValue(status);
    renderGiftClaim();

    const telegramLink = await screen.findByRole('link', { name: /Activate in Telegram/i });
    expect(telegramLink).toBeTruthy();
    expect(telegramLink.getAttribute('href')).toBe(CANONICAL_BOT_URL);

    // Email activation is also available
    expect(screen.getByRole('button', { name: /Activate by email/i })).toBeTruthy();
  });

  it('использует legacy fallback bot_claim_link если canonical bot_claim_url отсутствует', async () => {
    const status: PurchaseStatus = {
      status: 'paid',
      is_gift: true,
      is_claimable: true,
      tariff_name: 'Standard',
      period_days: 14,
      contact_type: null,
      recipient_contact_value: null,
      subscription_url: null,
      subscription_crypto_link: null,
      cabinet_email: null,
      cabinet_password: null,
      auto_login_token: null,
      contact_value: null,
      gift_message: null,
      recipient_in_bot: null,
      bot_link: null,
      claim_url: 'https://cab.example/gift/legacy',
      bot_claim_link: LEGACY_BOT_LINK,
      cabinet_claim_url: null,
      bot_claim_url: null,
    };

    getGiftClaimMock.mockResolvedValue(status);
    renderGiftClaim();

    const telegramLink = await screen.findByRole('link', { name: /Activate in Telegram/i });
    expect(telegramLink).toBeTruthy();
    expect(telegramLink.getAttribute('href')).toBe(LEGACY_BOT_LINK);
  });

  it('скрывает Telegram action при отсутствии Telegram URL, не затрагивая web claim', async () => {
    const status: PurchaseStatus = {
      status: 'paid',
      is_gift: true,
      is_claimable: true,
      tariff_name: 'Web Only Tariff',
      period_days: 30,
      contact_type: null,
      recipient_contact_value: null,
      subscription_url: null,
      subscription_crypto_link: null,
      cabinet_email: null,
      cabinet_password: null,
      auto_login_token: null,
      contact_value: null,
      gift_message: null,
      recipient_in_bot: null,
      bot_link: null,
      claim_url: 'https://cab.example/gift/legacy',
      bot_claim_link: null,
      cabinet_claim_url: 'https://cab.example/buy/gift/canonical',
      bot_claim_url: null,
    };

    getGiftClaimMock.mockResolvedValue(status);
    renderGiftClaim();

    // Gift title is rendered
    expect(await screen.findByRole('heading', { name: /You have a gift!/i })).toBeTruthy();
    expect(screen.getByText(/Web Only Tariff/i)).toBeTruthy();

    // Telegram link is NOT rendered
    expect(screen.queryByRole('link', { name: /Activate in Telegram/i })).toBeNull();

    // Web claim button is rendered and interactive
    const emailButton = screen.getByRole('button', { name: /Activate by email/i });
    expect(emailButton).toBeTruthy();
    fireEvent.click(emailButton);

    const emailInput = screen.getByPlaceholderText('email@example.com');
    expect(emailInput).toBeTruthy();
  });
});
