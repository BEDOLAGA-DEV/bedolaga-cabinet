// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GiftPurchaseStatus } from '@/api/gift';
import { copyToClipboard } from '@/utils/clipboard';
import GiftResult from './GiftResult';

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
vi.mock('@/api/gift', () => ({
  giftApi: {
    getPurchaseStatus: (token: string) => getPurchaseStatusMock(token),
  },
}));

const getTelegramWidgetConfigMock = vi.fn();
vi.mock('@/api/branding', () => ({
  brandingApi: {
    getTelegramWidgetConfig: () => getTelegramWidgetConfigMock(),
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
  getTelegramWidgetConfigMock.mockResolvedValue({
    bot_username: 'BedolagaTestBot',
  });
});

function renderGiftResult(search = '?token=test_token_1234567890') {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/gift/result${search}`]}>
        <Routes>
          <Route path="/gift/result" element={<GiftResult />} />
          <Route path="/gift" element={<div>My Gifts Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const CANONICAL_CODE = `GIFT_${'A'.repeat(59)}`;
const CANONICAL_BOT_URL = `https://t.me/BedolagaTestBot?start=${CANONICAL_CODE}`;
const CANONICAL_CABINET_URL = `https://cab.example/buy/gift/${'A'.repeat(64)}`;

describe('GiftResult canonical claim links and rendering', () => {
  it('gateway purchase в статусе paid + is_claimable отображает canonical gift_code и ссылки', async () => {
    const status: GiftPurchaseStatus = {
      status: 'paid',
      is_gift: true,
      is_code_only: true,
      is_claimable: true,
      purchase_token: '1234567890ab',
      tariff_name: 'VIP Tariff',
      period_days: 30,
      recipient_contact_value: null,
      gift_message: null,
      warning: null,
      gift_code: CANONICAL_CODE,
      bot_claim_url: CANONICAL_BOT_URL,
      cabinet_claim_url: CANONICAL_CABINET_URL,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderGiftResult();

    // Gift code display
    const codeElement = await screen.findByText(CANONICAL_CODE);
    expect(codeElement).toBeTruthy();
    expect(codeElement.className).toContain('break-all');
    expect(codeElement.className).toContain('font-mono');
    expect(codeElement.className).toContain('text-sm');

    // QR uses canonical botLink
    const qrElement = screen.getByTestId('qr-code');
    expect(qrElement.getAttribute('data-value')).toBe(CANONICAL_BOT_URL);

    // Share message preview shows canonical links
    expect(screen.getByText(CANONICAL_BOT_URL)).toBeTruthy();
    expect(screen.getByText(CANONICAL_CABINET_URL)).toBeTruthy();

    // Copy button copies canonical links
    const copyButton = screen.getByRole('button', { name: /Copy message/i });
    fireEvent.click(copyButton);

    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    const copiedText = vi.mocked(copyToClipboard).mock.calls[0][0];
    expect(copiedText).toContain(CANONICAL_BOT_URL);
    expect(copiedText).toContain(CANONICAL_CABINET_URL);
    expect(copiedText).not.toContain('GIFT-1234567890ab');
  });

  it('при отсутствии bot_claim_url и botUsername использует cabinet_claim_url для QR', async () => {
    getTelegramWidgetConfigMock.mockResolvedValue({
      bot_username: '',
    });

    const status: GiftPurchaseStatus = {
      status: 'paid',
      is_gift: true,
      is_code_only: true,
      is_claimable: true,
      purchase_token: '1234567890ab',
      tariff_name: 'VIP Tariff',
      period_days: 30,
      recipient_contact_value: null,
      gift_message: null,
      warning: null,
      gift_code: CANONICAL_CODE,
      bot_claim_url: null,
      cabinet_claim_url: CANONICAL_CABINET_URL,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderGiftResult();

    await screen.findByText(CANONICAL_CODE);
    const qrElement = screen.getByTestId('qr-code');
    expect(qrElement.getAttribute('data-value')).toBe(CANONICAL_CABINET_URL);
  });

  it('обрабатывает ответ старого backend без canonical-полей через legacy fallback', async () => {
    const legacyToken = 'short_token_123456';
    const shortCode = legacyToken.slice(0, 12);
    const expectedLegacyCode = `GIFT-${shortCode}`;
    const expectedLegacyBotLink = `https://t.me/BedolagaTestBot?start=GIFT_${shortCode}`;
    const expectedLegacyCabinetLink = `${window.location.origin}/gift?tab=activate&code=${encodeURIComponent(shortCode)}`;

    const status: GiftPurchaseStatus = {
      status: 'paid',
      is_gift: true,
      is_code_only: true,
      is_claimable: true,
      purchase_token: legacyToken,
      tariff_name: 'Standard',
      period_days: 60,
      recipient_contact_value: null,
      gift_message: null,
      warning: null,
      gift_code: null,
      bot_claim_url: null,
      cabinet_claim_url: null,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderGiftResult();

    const codeElement = await screen.findByText(expectedLegacyCode);
    expect(codeElement).toBeTruthy();

    await screen.findByText(expectedLegacyBotLink);

    const qrElement = screen.getByTestId('qr-code');
    expect(qrElement.getAttribute('data-value')).toBe(expectedLegacyBotLink);

    expect(screen.getByText(expectedLegacyCabinetLink)).toBeTruthy();

    const copyButton = screen.getByRole('button', { name: /Copy message/i });
    fireEvent.click(copyButton);

    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    const copiedText = vi.mocked(copyToClipboard).mock.calls[0][0];
    expect(copiedText).toContain(expectedLegacyBotLink);
    expect(copiedText).toContain(expectedLegacyCabinetLink);
  });

  it('кнопка Мои подарки выполняет переход на /gift?tab=myGifts', async () => {
    const status: GiftPurchaseStatus = {
      status: 'paid',
      is_gift: true,
      is_code_only: true,
      is_claimable: true,
      purchase_token: '1234567890ab',
      tariff_name: 'VIP Tariff',
      period_days: 30,
      recipient_contact_value: null,
      gift_message: null,
      warning: null,
      gift_code: CANONICAL_CODE,
      bot_claim_url: CANONICAL_BOT_URL,
      cabinet_claim_url: CANONICAL_CABINET_URL,
    };

    getPurchaseStatusMock.mockResolvedValue(status);
    renderGiftResult();

    await screen.findByText(CANONICAL_CODE);
    const myGiftsButton = screen.getByRole('button', { name: /My Gifts/i });
    fireEvent.click(myGiftsButton);

    expect(await screen.findByText('My Gifts Page')).toBeTruthy();
  });
});
