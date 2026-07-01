// Shared harness for page previews. Wraps a data-driven screen in the full
// provider stack (MemoryRouter + PlatformProvider + ThemeColorsProvider +
// QueryClientProvider) and seeds the react-query cache + auth store with mock
// data so `useQuery`/`useAuthStore` return realistic content instead of loading
// or empty states. All symbols come from the DS bundle global (shimmed by
// 'cabinet-frontend').
import {
  QueryClient,
  QueryClientProvider,
  MemoryRouter,
  Routes,
  Route,
  PlatformProvider,
  ThemeColorsProvider,
  ToastProvider,
  useAuthStore,
} from 'cabinet-frontend';

// A believable signed-in user; pages read name/email/balance/telegram fields.
export const mockUser = {
  id: 1,
  telegram_id: 100200300,
  username: 'ivan_petrov',
  first_name: 'Иван',
  last_name: 'Петров',
  full_name: 'Иван Петров',
  email: 'ivan.petrov@example.com',
  language: 'ru',
  balance_kopeks: 245000,
  balance: 2450,
  is_admin: false,
  is_active: true,
  has_active_subscription: true,
  created_at: '2025-11-02T10:00:00Z',
  photo_url: '',
};

// One-time global seeding of the zustand auth/permission stores. Called at
// module load by each page preview via seedStores().
// Neutralize the network so on-mount side effects (refreshUser, traffic
// refresh, mutations) don't leave requests pending — Playwright waits for
// networkidle, and a real axios call to the mock host would hang the capture.
// Seeded react-query data is fresh (staleTime Infinity), so nothing needs to
// actually fetch; this only silences the stragglers.
let netStubbed = false;
function stubNetwork() {
  if (netStubbed || typeof window === 'undefined') return;
  netStubbed = true;
  try {
    // fetch → never-resolving (no network request registered)
    (window as any).fetch = () => new Promise(() => {});
    // XHR → inert: open/send do nothing, so no request is ever dispatched.
    class InertXHR {
      open() {}
      send() {}
      setRequestHeader() {}
      abort() {}
      addEventListener() {}
      removeEventListener() {}
      readonly readyState = 0;
      status = 0;
      response = '';
      responseText = '';
    }
    (window as any).XMLHttpRequest = InertXHR;
  } catch {
    /* non-fatal */
  }
}

export function seedStores(authenticated = true) {
  stubNetwork();
  try {
    // Force dark theme (headless chromium defaults to light via
    // prefers-color-scheme; useTheme reads this key and toggles the .dark class).
    localStorage.setItem('cabinet-theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    // Suppress the first-visit onboarding modal so it doesn't overlay pages.
    localStorage.setItem('onboarding_completed', 'true');
  } catch {
    /* no localStorage — non-fatal */
  }
  try {
    (useAuthStore as any).setState?.({
      user: authenticated ? mockUser : null,
      isAuthenticated: authenticated,
      isAdmin: false,
      isLoading: false,
    });
  } catch {
    /* store shape drift — non-fatal for the preview */
  }
}

// ── Reusable mock data (shared across page previews) ──────────────────────
export const mockSubscription = {
  id: 1,
  name: 'Premium',
  status: 'active',
  is_trial: false,
  start_date: '2026-06-01T00:00:00Z',
  end_date: '2026-07-30T00:00:00Z',
  days_left: 29,
  hours_left: 12,
  minutes_left: 30,
  time_left_display: '29 дней',
  traffic_limit_gb: 200,
  traffic_used_gb: 72,
  traffic_used_percent: 36,
  device_limit: 5,
  connected_squads: ['Нидерланды', 'Германия'],
  servers: [],
  autopay_enabled: true,
  autopay_days_before: 3,
  subscription_url: 'https://sub.example.com/abc123',
  hide_subscription_link: false,
  is_active: true,
  is_expired: false,
  is_limited: false,
  tariff_name: 'Premium',
};

// getSubscription() returns SubscriptionStatusResponse (wrapped).
export const mockSubscriptionResponse = {
  has_subscription: true,
  subscription: mockSubscription,
};

export const mockSubscriptionListItem = {
  id: 1,
  name: 'Premium',
  status: 'active',
  tariff_id: 2,
  tariff_name: 'Premium',
  traffic_limit_gb: 200,
  traffic_used_gb: 72,
  device_limit: 5,
  end_date: '2026-07-30T00:00:00Z',
  subscription_url: 'https://sub.example.com/abc123',
  subscription_crypto_link: null,
  is_trial: false,
  autopay_enabled: true,
  connected_squads: ['Нидерланды', 'Германия'],
};

// Two items + multi_tariff so the Subscriptions list renders (a single item
// with multi_tariff off redirects to the detail page).
export const mockSubscriptionsList = {
  subscriptions: [
    mockSubscriptionListItem,
    {
      ...mockSubscriptionListItem,
      id: 2,
      name: 'Базовый',
      tariff_id: 1,
      tariff_name: 'Базовый',
      traffic_limit_gb: 50,
      traffic_used_gb: 12,
      device_limit: 2,
      connected_squads: ['Финляндия'],
      is_trial: false,
    },
  ],
  multi_tariff_enabled: true,
};

export const mockTrialInfo = {
  is_available: false,
  duration_days: 3,
  traffic_limit_gb: 10,
  device_limit: 1,
  requires_payment: false,
  price_kopeks: 0,
  price_rubles: 0,
  reason_unavailable: 'already_used',
};

export const mockBalance = { balance_kopeks: 245000, balance_rubles: 2450 };

export const mockPaymentMethods = [
  {
    id: 'sbp',
    name: 'СБП',
    description: 'Система быстрых платежей',
    min_amount_kopeks: 10000,
    max_amount_kopeks: 10000000,
    is_available: true,
  },
  {
    id: 'card',
    name: 'Банковская карта',
    description: 'Visa / MasterCard / МИР',
    min_amount_kopeks: 10000,
    max_amount_kopeks: 10000000,
    is_available: true,
  },
  {
    id: 'crypto',
    name: 'Криптовалюта',
    description: 'USDT, BTC, TON',
    min_amount_kopeks: 50000,
    max_amount_kopeks: 50000000,
    is_available: true,
  },
];

type Seed = Array<[readonly unknown[], unknown]>;

// Build a QueryClient with retries off and everything fresh forever, then seed
// each [queryKey, data] pair so the matching useQuery resolves synchronously.
function makeClient(seed: Seed) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity, refetchOnMount: false },
    },
  });
  for (const [key, data] of seed) qc.setQueryData(key as unknown[], data);
  return qc;
}

export function PageFrame({
  seed = [],
  route = '/',
  routePattern,
  width = 420,
  authenticated = true,
  children,
}: {
  seed?: Seed;
  route?: string;
  // The <Route path> pattern (e.g. "/subscriptions/:subscriptionId") so
  // useParams() populates. Defaults to `route` (works for param-less pages).
  routePattern?: string;
  width?: number;
  authenticated?: boolean;
  children: any;
}) {
  seedStores(authenticated);
  const qc = makeClient(seed);
  const frame = (
    <div
      style={{
        width,
        margin: '0 auto',
        minHeight: 200,
        background: 'rgb(10,15,26)',
        color: 'rgb(241,245,249)',
      }}
    >
      {children}
    </div>
  );
  // QueryClientProvider must be OUTERMOST — ThemeColorsProvider (and other
  // providers) call useQuery, so they must sit inside it. A real <Route> is
  // needed for useParams() to populate the page's route params.
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <PlatformProvider>
          <ThemeColorsProvider>
            <ToastProvider>
              {/* framer-motion enter animations don't progress in headless
                  capture — force their opacity:0 initial state visible. */}
              <style>{'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}'}</style>
              <Routes>
                <Route path={routePattern ?? route} element={frame} />
                {/* Catch-all so an internal <Navigate> doesn't blank the card. */}
                <Route path="*" element={frame} />
              </Routes>
            </ToastProvider>
          </ThemeColorsProvider>
        </PlatformProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
