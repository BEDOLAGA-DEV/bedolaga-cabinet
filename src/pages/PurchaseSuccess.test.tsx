// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseStatus } from '@/api/landings';
import { copyToClipboard } from '@/utils/clipboard';
import PurchaseSuccess from './PurchaseSuccess';

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

const getPurchaseStatusMock = vi.fn();
const activatePurchaseMock = vi.fn();

vi.mock('@/api/landings', () => ({
  landingApi: {
    getPurchaseStatus: (token: string) => getPurchaseStatusMock(token),
    activatePurchase: (token: string) => activatePurchaseMock(token),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size }: { value: string; size?: number }) => (
    <svg data-testid="qr-code" data-value={value} width={size} height={size} />
  ),
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

function renderPurchaseSuccess(token = 'test_token_123', search = '') {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/buy/success/${token}${search}`]}>
        <Routes>
          <Route path="/buy/success/:token" element={<PurchaseSuccess />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const CANONICAL_CABINET_URL = 'https://cab.example/buy/gift/abcdef1234567890abcdef1234567890';
const CANONICAL_BOT_URL = 'https://t.me/BedolagaBot?start=GIFT_abcdef123456';
const LEGACY_CLAIM_URL = 'https://cab.example/gift/123456';
const LEGACY_BOT_URL = 'https://t.me/BedolagaBot?start=123456';

describe('PurchaseSuccess gift flow canonical vs legacy link selection', () => {
  it('предпочитает canonical-поля (cabinet_claim_url, bot_claim_url) при одновременном наличии legacy aliases', async () => {
    const status: PurchaseStatus = {
      status: 'paid',
      is_gift: true,
      is_claimable: true,
      tariff_name: 'VIP Plus',
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
      claim_url: LEGACY_CLAIM_URL,
      bot_claim_link: LEGACY_BOT_URL,
      cabinet_claim_url: CANONICAL_CABINET_URL,
      bot_claim_url: CANONICAL_BOT_URL,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderPurchaseSuccess();

    // Gift link and Telegram link are displayed with canonical values
    expect(await screen.findByText(CANONICAL_CABINET_URL)).toBeTruthy();
    expect(screen.getByText(CANONICAL_BOT_URL)).toBeTruthy();

    // Legacy values are not rendered
    expect(screen.queryByText(LEGACY_CLAIM_URL)).toBeNull();
    expect(screen.queryByText(LEGACY_BOT_URL)).toBeNull();

    // Copying message includes canonical URLs
    const copyButton = screen.getByRole('button', { name: /^Copy message$/i });
    fireEvent.click(copyButton);

    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    const copiedText = vi.mocked(copyToClipboard).mock.calls[0][0];
    expect(copiedText).toContain(CANONICAL_CABINET_URL);
    expect(copiedText).toContain(CANONICAL_BOT_URL);
    expect(copiedText).not.toContain(LEGACY_CLAIM_URL);
    expect(copiedText).not.toContain(LEGACY_BOT_URL);
  });

  it('использует legacy fallback (claim_url, bot_claim_link) когда canonical-поля отсутствуют', async () => {
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
      claim_url: LEGACY_CLAIM_URL,
      bot_claim_link: LEGACY_BOT_URL,
      cabinet_claim_url: null,
      bot_claim_url: null,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderPurchaseSuccess();

    expect(await screen.findByText(LEGACY_CLAIM_URL)).toBeTruthy();
    expect(screen.getByText(LEGACY_BOT_URL)).toBeTruthy();

    const copyButton = screen.getByRole('button', { name: /^Copy message$/i });
    fireEvent.click(copyButton);

    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    const copiedText = vi.mocked(copyToClipboard).mock.calls[0][0];
    expect(copiedText).toContain(LEGACY_CLAIM_URL);
    expect(copiedText).toContain(LEGACY_BOT_URL);
  });

  it('скрывает Telegram link если telegram url отсутствует', async () => {
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
      claim_url: CANONICAL_CABINET_URL,
      bot_claim_link: null,
      cabinet_claim_url: CANONICAL_CABINET_URL,
      bot_claim_url: null,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderPurchaseSuccess();

    expect(await screen.findByText(CANONICAL_CABINET_URL)).toBeTruthy();
    expect(screen.queryByText(/Telegram link/i)).toBeNull();

    const copyButton = screen.getByRole('button', { name: /^Copy message$/i });
    fireEvent.click(copyButton);

    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    const copiedText = vi.mocked(copyToClipboard).mock.calls[0][0];
    expect(copiedText).toContain(CANONICAL_CABINET_URL);
    expect(copiedText).not.toContain('Telegram:');
  });

  it('показывает canonical-ссылки покупателю для claimable pending_activation', async () => {
    const status: PurchaseStatus = {
      status: 'pending_activation',
      is_gift: true,
      is_claimable: true,
      tariff_name: 'Pending Gift',
      period_days: 30,
      contact_type: 'email',
      recipient_contact_value: 're***@example.com',
      subscription_url: null,
      subscription_crypto_link: null,
      cabinet_email: null,
      cabinet_password: null,
      auto_login_token: null,
      contact_value: null,
      gift_message: null,
      recipient_in_bot: null,
      bot_link: null,
      claim_url: LEGACY_CLAIM_URL,
      bot_claim_link: LEGACY_BOT_URL,
      cabinet_claim_url: CANONICAL_CABINET_URL,
      bot_claim_url: CANONICAL_BOT_URL,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderPurchaseSuccess();

    expect(await screen.findByText(CANONICAL_CABINET_URL)).toBeTruthy();
    expect(screen.getByText(CANONICAL_BOT_URL)).toBeTruthy();
    expect(screen.queryByText(LEGACY_CLAIM_URL)).toBeNull();
    expect(screen.queryByText(LEGACY_BOT_URL)).toBeNull();
    expect(screen.queryByRole('button', { name: 'landing.activateNow' })).toBeNull();
  });

  it('сохраняет legacy fallback покупателю для claimable pending_activation', async () => {
    const status: PurchaseStatus = {
      status: 'pending_activation',
      is_gift: true,
      is_claimable: true,
      tariff_name: 'Legacy Pending Gift',
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
      claim_url: LEGACY_CLAIM_URL,
      bot_claim_link: LEGACY_BOT_URL,
      cabinet_claim_url: null,
      bot_claim_url: null,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderPurchaseSuccess();

    expect(await screen.findByText(LEGACY_CLAIM_URL)).toBeTruthy();
    expect(screen.getByText(LEGACY_BOT_URL)).toBeTruthy();
  });

  it('сохраняет recipient activation flow при параметре activate=1', async () => {
    const status: PurchaseStatus = {
      status: 'pending_activation',
      is_gift: true,
      is_claimable: true,
      tariff_name: 'Recipient Gift',
      period_days: 30,
      contact_type: 'email',
      recipient_contact_value: 're***@example.com',
      subscription_url: null,
      subscription_crypto_link: null,
      cabinet_email: null,
      cabinet_password: null,
      auto_login_token: null,
      contact_value: null,
      gift_message: null,
      recipient_in_bot: null,
      bot_link: null,
      claim_url: LEGACY_CLAIM_URL,
      bot_claim_link: LEGACY_BOT_URL,
      cabinet_claim_url: CANONICAL_CABINET_URL,
      bot_claim_url: CANONICAL_BOT_URL,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderPurchaseSuccess('test_token_123', '?activate=1');

    expect(await screen.findByRole('button', { name: 'landing.activateNow' })).toBeTruthy();
    expect(screen.queryByText(CANONICAL_CABINET_URL)).toBeNull();
    expect(screen.queryByText(CANONICAL_BOT_URL)).toBeNull();
  });
});
