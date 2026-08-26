// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GiftConfig, SentGift, ReceivedGift, ActivateGiftResponse } from '@/api/gift';
import GiftSubscription, { isGiftActivated, isGiftAvailable } from './GiftSubscription';
import { AppShell } from '@/components/layout/AppShell/AppShell';
import { AppHeader } from '@/components/layout/AppShell/AppHeader';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { ToastProvider } from '@/components/Toast';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'gift.pageTitle': 'Подарки',
        'gift.tabBuy': 'Купить',
        'gift.tabActivate': 'Активировать',
        'gift.tabMyGifts': 'Мои подарки',
        'gift.purchasesDisabled': 'Покупка подарков временно недоступна',
        'gift.purchasesDisabledDesc':
          'Покупка новых подарков временно отключена. Вы можете активировать имеющийся подарок или посмотреть историю на соседних вкладках.',
        'gift.activateTitle': 'Введите код подарка',
        'gift.activateDescription': 'Введите код подарка, полученный от друга или знакомого',
        'gift.activateCodePlaceholder': 'GIFT-XXXXXXXXXXXX',
        'gift.activateButton': 'Активировать подарок',
        'gift.activateSuccess': 'Подарок активирован!',
        'gift.myGiftsEmpty': 'У вас пока нет подарков',
        'gift.selectTariff': 'ВЫБЕРИТЕ ТАРИФ',
        'gift.selectPeriod': 'ПЕРИОД ПОДПИСКИ',
        'gift.giftButton': 'Подарить',
        'gift.statusActivated': 'АКТИВИРОВАН',
        'gift.statusAvailable': 'ДОСТУПЕН',
        'gift.statusPendingActivation': 'ОЖИДАЕТ АКТИВАЦИИ',
        'gift.statusDelivered': 'ДОСТАВЛЕН',
        'gift.statusPending': 'В ОБРАБОТКЕ',
        'gift.statusFailed': 'ОШИБКА',
        'gift.statusExpired': 'ИСТЁК',
        'gift.activeGiftsTitle': 'Ожидают активации',
        'gift.activatedGiftsTitle': 'Активированные подарки',
        'gift.receivedGiftsTitle': 'Полученные подарки',
        'gift.shareGift': 'Поделиться',
        'gift.daysShort': 'дн.',
        'nav.dashboard': 'Главная',
        'nav.subscription': 'Подписка',
        'nav.balance': 'Баланс',
        'nav.referral': 'Рефералы',
        'nav.gift': 'Подарки',
        'nav.support': 'Поддержка',
        'nav.info': 'Информация',
        'nav.profile': 'Профиль',
      };
      if (key === 'gift.activateSuccessDesc') {
        return `${options?.tariff}: ${options?.days} дн. добавлено к вашей подписке`;
      }
      if (key === 'gift.activatedBy') {
        return `Активирован пользователем ${options?.username}`;
      }
      if (key === 'gift.sentTo') {
        return `Отправлен: ${options?.recipient}`;
      }
      if (key === 'gift.devicesShort') {
        return `${options?.count} устр.`;
      }
      return translations[key] ?? key;
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: () => () => {},
    isConnected: true,
  }),
}));

vi.mock('@/providers/useWebSocketContext', () => ({
  useWebSocketContext: () => ({
    subscribe: () => () => {},
    isConnected: true,
  }),
}));

const getConfigMock = vi.fn();
const getSentGiftsMock = vi.fn();
const getReceivedGiftsMock = vi.fn();
const activateGiftCodeMock = vi.fn();
const createPurchaseMock = vi.fn();

vi.mock('@/api/gift', () => ({
  giftApi: {
    getConfig: () => getConfigMock(),
    getSentGifts: () => getSentGiftsMock(),
    getReceivedGifts: () => getReceivedGiftsMock(),
    activateGiftCode: (code: string) => activateGiftCodeMock(code),
    createPurchase: (req: unknown) => createPurchaseMock(req),
  },
}));

vi.mock('@/api/branding', () => ({
  brandingApi: {
    getBranding: vi
      .fn()
      .mockResolvedValue({ name: 'Bedolaga', logo_letter: 'B', has_custom_logo: false }),
    getTelegramWidgetConfig: vi.fn().mockResolvedValue({ bot_username: 'BedolagaBot' }),
    getLogoUrl: vi.fn().mockReturnValue(null),
    getGiftEnabled: vi.fn().mockResolvedValue({ enabled: false }),
    getFullscreenEnabled: vi.fn().mockResolvedValue({ enabled: false }),
  },
  getCachedBranding: vi.fn().mockReturnValue(null),
  setCachedBranding: vi.fn(),
  preloadLogo: vi.fn().mockResolvedValue(undefined),
  isLogoPreloaded: vi.fn().mockReturnValue(false),
}));

vi.mock('@/api/themeColors', () => ({
  themeColorsApi: {
    getEnabledThemes: vi.fn().mockResolvedValue({ dark: true, light: true }),
  },
}));

vi.mock('@/api/referral', () => ({
  referralApi: {
    getReferralTerms: vi.fn().mockResolvedValue({ is_enabled: false }),
  },
}));

vi.mock('@/api/wheel', () => ({
  wheelApi: {
    getConfig: vi.fn().mockResolvedValue({ is_enabled: false }),
  },
}));

vi.mock('@/api/contests', () => ({
  contestsApi: {
    getCount: vi.fn().mockResolvedValue({ count: 0 }),
  },
}));

vi.mock('@/api/polls', () => ({
  pollsApi: {
    getCount: vi.fn().mockResolvedValue({ count: 0 }),
  },
}));

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({
    currency: 'RUB',
    symbol: '₽',
    rate: 1,
    format: (kopeks: number) => `${kopeks / 100} ₽`,
  }),
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

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

try {
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
} catch {
  // ignore
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  storageMock.clear();
});

function renderGiftSubscription(initialUrl = '/gift') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialUrl]}>
            <Routes>
              <Route path="/gift" element={<GiftSubscription />} />
              <Route path="/" element={<div>Home Page</div>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </PlatformProvider>
    </QueryClientProvider>,
  );
}

const mockDisabledConfig: GiftConfig = {
  is_enabled: false,
  tariffs: [],
  payment_methods: [],
  balance_kopeks: 50000,
  currency_symbol: '₽',
  promo_group_name: null,
  active_discount_percent: null,
  active_discount_expires_at: null,
};

describe('GiftSubscription when purchases are disabled (is_enabled=false)', () => {
  it('вкладка покупки показывает сообщение о временно отключенных покупках и не редиректит', async () => {
    getConfigMock.mockResolvedValue(mockDisabledConfig);
    getSentGiftsMock.mockResolvedValue([]);
    getReceivedGiftsMock.mockResolvedValue([]);

    renderGiftSubscription('/gift');

    // Page title and tabs are rendered
    expect(await screen.findByRole('heading', { name: 'Подарки' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Купить' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Активировать' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Мои подарки' })).toBeTruthy();

    // Buy tab is active and shows disabled message
    expect(await screen.findByText('Покупка подарков временно недоступна')).toBeTruthy();
    expect(
      screen.getByText(
        'Покупка новых подарков временно отключена. Вы можете активировать имеющийся подарок или посмотреть историю на соседних вкладках.',
      ),
    ).toBeTruthy();

    // User is NOT redirected away
    expect(screen.queryByText('Home Page')).toBeNull();
  });

  it('вкладка активации открывается и позволяет активировать подарок', async () => {
    getConfigMock.mockResolvedValue(mockDisabledConfig);
    const activateResponse: ActivateGiftResponse = {
      status: 'ok',
      tariff_name: 'Premium VPN',
      period_days: 30,
    };
    activateGiftCodeMock.mockResolvedValue(activateResponse);

    renderGiftSubscription('/gift');

    expect(await screen.findByRole('heading', { name: 'Подарки' })).toBeTruthy();

    // Switch to Activate tab
    const activateTab = screen.getByRole('tab', { name: 'Активировать' });
    fireEvent.click(activateTab);

    // Code input is present
    const input = await screen.findByPlaceholderText('GIFT-XXXXXXXXXXXX');
    expect(input).toBeTruthy();

    // Enter code and activate
    fireEvent.change(input, { target: { value: 'GIFT-TEST12345' } });
    const activateButton = screen.getByRole('button', { name: 'Активировать подарок' });
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(activateGiftCodeMock).toHaveBeenCalledWith('GIFT-TEST12345');
    });

    expect(await screen.findByText('Подарок активирован!')).toBeTruthy();
    expect(screen.getByText('Premium VPN: 30 дн. добавлено к вашей подписке')).toBeTruthy();
  });

  it('прямая ссылка ?tab=activate&code=... открывает вкладку активации с заполненным кодом', async () => {
    getConfigMock.mockResolvedValue(mockDisabledConfig);
    const activateResponse: ActivateGiftResponse = {
      status: 'ok',
      tariff_name: 'Super VPN',
      period_days: 60,
    };
    activateGiftCodeMock.mockResolvedValue(activateResponse);

    renderGiftSubscription('/gift?tab=activate&code=GIFT-ABC123XYZ');

    // Activate tab is active immediately
    const input = (await screen.findByPlaceholderText('GIFT-XXXXXXXXXXXX')) as HTMLInputElement;
    expect(input.value).toBe('ABC123XYZ');

    const activateButton = screen.getByRole('button', { name: 'Активировать подарок' });
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(activateGiftCodeMock).toHaveBeenCalledWith('ABC123XYZ');
    });

    expect(await screen.findByText('Подарок активирован!')).toBeTruthy();
  });

  it('вкладка истории (Мои подарки) открывается и отображает список подарков', async () => {
    getConfigMock.mockResolvedValue(mockDisabledConfig);
    const sentGifts: SentGift[] = [
      {
        token: 'gift_tok_1',
        tariff_name: 'Standard VPN',
        period_days: 30,
        device_limit: 2,
        status: 'delivered',
        gift_recipient_value: '@friend',
        gift_message: 'Happy Birthday!',
        activated_by_username: 'friend_user',
        created_at: '2026-08-01T10:00:00Z',
      },
    ];
    const receivedGifts: ReceivedGift[] = [];
    getSentGiftsMock.mockResolvedValue(sentGifts);
    getReceivedGiftsMock.mockResolvedValue(receivedGifts);

    renderGiftSubscription('/gift');

    expect(await screen.findByRole('heading', { name: 'Подарки' })).toBeTruthy();

    // Switch to My Gifts tab
    const myGiftsTab = screen.getByRole('tab', { name: 'Мои подарки' });
    fireEvent.click(myGiftsTab);

    // Sent gift is displayed
    expect(await screen.findByText('Standard VPN')).toBeTruthy();
    expect(screen.getByText(/friend_user/)).toBeTruthy();
  });
});

describe('Gift status helper functions', () => {
  describe('isGiftActivated', () => {
    it('returns true for delivered gift with activated_by_username present', () => {
      const gift: SentGift = {
        token: 'gift_tok_123',
        tariff_name: 'Tariff',
        period_days: 30,
        device_limit: 1,
        status: 'delivered',
        gift_recipient_value: null,
        gift_message: null,
        activated_by_username: 'recipient_user',
        created_at: null,
      };
      expect(isGiftActivated(gift)).toBe(true);
    });

    it('returns true for delivered gift with activated_by_username === null', () => {
      const gift: SentGift = {
        token: 'gift_tok_123',
        tariff_name: 'Tariff',
        period_days: 30,
        device_limit: 1,
        status: 'delivered',
        gift_recipient_value: null,
        gift_message: null,
        activated_by_username: null,
        created_at: null,
      };
      expect(isGiftActivated(gift)).toBe(true);
    });

    it('returns false for paid status', () => {
      const gift: SentGift = {
        token: 'gift_tok_123',
        tariff_name: 'Tariff',
        period_days: 30,
        device_limit: 1,
        status: 'paid',
        gift_recipient_value: null,
        gift_message: null,
        activated_by_username: null,
        created_at: null,
      };
      expect(isGiftActivated(gift)).toBe(false);
    });

    it('returns false for pending_activation status', () => {
      const gift: SentGift = {
        token: 'gift_tok_123',
        tariff_name: 'Tariff',
        period_days: 30,
        device_limit: 1,
        status: 'pending_activation',
        gift_recipient_value: null,
        gift_message: null,
        activated_by_username: null,
        created_at: null,
      };
      expect(isGiftActivated(gift)).toBe(false);
    });

    it('returns false for pending, failed, expired statuses', () => {
      ['pending', 'failed', 'expired'].forEach((status) => {
        const gift: SentGift = {
          token: 'gift_tok_123',
          tariff_name: 'Tariff',
          period_days: 30,
          device_limit: 1,
          status,
          gift_recipient_value: null,
          gift_message: null,
          activated_by_username: null,
          created_at: null,
        };
        expect(isGiftActivated(gift)).toBe(false);
      });
    });
  });

  describe('isGiftAvailable', () => {
    it('returns true for paid and pending_activation', () => {
      expect(isGiftAvailable('paid')).toBe(true);
      expect(isGiftAvailable('pending_activation')).toBe(true);
    });

    it('returns false for delivered status', () => {
      expect(isGiftAvailable('delivered')).toBe(false);
    });

    it('returns false for pending, failed, expired statuses', () => {
      expect(isGiftAvailable('pending')).toBe(false);
      expect(isGiftAvailable('failed')).toBe(false);
      expect(isGiftAvailable('expired')).toBe(false);
      expect(isGiftAvailable('unknown')).toBe(false);
    });
  });
});

describe('SentGiftCard and MyGiftsTabContent activation behavior', () => {
  it('отображает delivered подарок с username как активированный без кнопок отправки/кода', async () => {
    getConfigMock.mockResolvedValue(mockDisabledConfig);
    const sentGifts: SentGift[] = [
      {
        token: 'gift_delivered_1',
        tariff_name: 'Delivered VPN',
        period_days: 30,
        device_limit: 2,
        status: 'delivered',
        gift_recipient_value: '@friend',
        gift_message: null,
        activated_by_username: 'happy_recipient',
        created_at: '2026-08-01T10:00:00Z',
      },
    ];
    getSentGiftsMock.mockResolvedValue(sentGifts);
    getReceivedGiftsMock.mockResolvedValue([]);

    renderGiftSubscription('/gift?tab=myGifts');

    expect(await screen.findByRole('heading', { name: 'Активированные подарки' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Ожидают активации' })).toBeNull();
    expect(screen.getByText('Delivered VPN')).toBeTruthy();
    expect(screen.getByText('АКТИВИРОВАН')).toBeTruthy();
    expect(screen.getByText('Активирован пользователем happy_recipient')).toBeTruthy();

    // No gift code display, no share button
    expect(screen.queryByRole('button', { name: /поделиться/i })).toBeNull();
    expect(screen.queryByText(/GIFT-/)).toBeNull();
  });

  it('отображает delivered подарок с activated_by_username=null как активированный без кнопок отправки/кода и без legacy fallback', async () => {
    getConfigMock.mockResolvedValue(mockDisabledConfig);
    const sentGifts: SentGift[] = [
      {
        token: 'gift_delivered_no_user_123456',
        tariff_name: 'Delivered Email VPN',
        period_days: 60,
        device_limit: 3,
        status: 'delivered',
        gift_recipient_value: 'user@example.com',
        gift_message: null,
        activated_by_username: null,
        created_at: '2026-08-01T10:00:00Z',
      },
    ];
    getSentGiftsMock.mockResolvedValue(sentGifts);
    getReceivedGiftsMock.mockResolvedValue([]);

    renderGiftSubscription('/gift?tab=myGifts');

    expect(await screen.findByRole('heading', { name: 'Активированные подарки' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Ожидают активации' })).toBeNull();
    expect(screen.getByText('Delivered Email VPN')).toBeTruthy();
    expect(screen.getByText('АКТИВИРОВАН')).toBeTruthy();
    expect(screen.queryByText(/Активирован пользователем/)).toBeNull();
    expect(screen.getByText('Отправлен: user@example.com')).toBeTruthy();

    // No gift code display, no share button, no short token fallback code
    expect(screen.queryByRole('button', { name: /поделиться/i })).toBeNull();
    expect(screen.queryByText(/GIFT-gift_delive/)).toBeNull();
    expect(screen.queryByText(/GIFT-/)).toBeNull();
  });

  it('отображает paid подарок как доступный для отправки с кодом и кнопкой поделиться', async () => {
    getConfigMock.mockResolvedValue(mockDisabledConfig);
    const sentGifts: SentGift[] = [
      {
        token: 'gift_tok_paid_123',
        tariff_name: 'Available VPN',
        period_days: 30,
        device_limit: 1,
        status: 'paid',
        gift_recipient_value: null,
        gift_message: null,
        activated_by_username: null,
        created_at: '2026-08-01T10:00:00Z',
        gift_code: 'GIFT_CANONICAL_CODE_PAID',
        bot_claim_url: 'https://t.me/BedolagaBot?start=GIFT_CANONICAL_CODE_PAID',
        cabinet_claim_url: 'http://localhost:3000/gift?tab=activate&code=GIFT_CANONICAL_CODE_PAID',
      },
    ];
    getSentGiftsMock.mockResolvedValue(sentGifts);
    getReceivedGiftsMock.mockResolvedValue([]);

    renderGiftSubscription('/gift?tab=myGifts');

    expect(await screen.findByRole('heading', { name: 'Ожидают активации' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Активированные подарки' })).toBeNull();
    expect(screen.getByText('Available VPN')).toBeTruthy();
    expect(screen.getByText('ДОСТУПЕН')).toBeTruthy();
    expect(screen.getByText('GIFT_CANONICAL_CODE_PAID')).toBeTruthy();
    expect(screen.getByRole('button', { name: /поделиться/i })).toBeTruthy();
  });

  it('отображает pending_activation подарок как доступный для отправки с кодом и кнопкой поделиться', async () => {
    getConfigMock.mockResolvedValue(mockDisabledConfig);
    const sentGifts: SentGift[] = [
      {
        token: 'gift_tok_pending_123',
        tariff_name: 'Pending Activation VPN',
        period_days: 90,
        device_limit: 5,
        status: 'pending_activation',
        gift_recipient_value: null,
        gift_message: null,
        activated_by_username: null,
        created_at: '2026-08-01T10:00:00Z',
        gift_code: 'GIFT_CANONICAL_CODE_PENDING',
        bot_claim_url: 'https://t.me/BedolagaBot?start=GIFT_CANONICAL_CODE_PENDING',
        cabinet_claim_url:
          'http://localhost:3000/gift?tab=activate&code=GIFT_CANONICAL_CODE_PENDING',
      },
    ];
    getSentGiftsMock.mockResolvedValue(sentGifts);
    getReceivedGiftsMock.mockResolvedValue([]);

    renderGiftSubscription('/gift?tab=myGifts');

    expect(await screen.findByRole('heading', { name: 'Ожидают активации' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Активированные подарки' })).toBeNull();
    expect(screen.getByText('Pending Activation VPN')).toBeTruthy();
    expect(screen.getByText('ДОСТУПЕН')).toBeTruthy();
    expect(screen.getByText('GIFT_CANONICAL_CODE_PENDING')).toBeTruthy();
    expect(screen.getByRole('button', { name: /поделиться/i })).toBeTruthy();
  });
});

describe('Navigation item /gift availability', () => {
  it('пункт /gift всегда присутствует в desktop-навигации AppShell', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PlatformProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={['/']}>
              <AppShell>
                <div>App Content</div>
              </AppShell>
            </MemoryRouter>
          </ToastProvider>
        </PlatformProvider>
      </QueryClientProvider>,
    );

    const giftLinks = screen.getAllByRole('link', { name: 'Подарки' });
    expect(giftLinks.length).toBeGreaterThanOrEqual(1);
    expect(giftLinks.some((link) => link.getAttribute('href') === '/gift')).toBe(true);
  });

  it('пункт /gift всегда присутствует в mobile-навигации AppHeader', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PlatformProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={['/']}>
              <AppHeader
                mobileMenuOpen={true}
                setMobileMenuOpen={() => {}}
                onCommandPaletteOpen={() => {}}
                headerHeight={56}
                isFullscreen={false}
                safeAreaInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
                contentSafeAreaInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
              />
            </MemoryRouter>
          </ToastProvider>
        </PlatformProvider>
      </QueryClientProvider>,
    );

    const giftLinks = screen.getAllByRole('link', { name: /Подарки/i });
    expect(giftLinks.length).toBeGreaterThanOrEqual(1);
    expect(giftLinks.some((link) => link.getAttribute('href') === '/gift')).toBe(true);
  });
});
