// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import AdminPaymentMethodEdit from './AdminPaymentMethodEdit';

vi.mock('../utils/withdrawalUtils', () => ({ localeMap: { ru: 'ru-RU' } }));

let providerEnabled = false;
const update = vi.fn().mockResolvedValue({});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/platform/hooks/usePlatform', () => ({
  usePlatform: () => ({ capabilities: { hasBackButton: false } }),
}));
vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../api/adminPaymentMethods', () => ({
  adminPaymentMethodsApi: {
    getAll: async () => [
      {
        method_id: 'cispay',
        default_display_name: 'CisPay',
        is_enabled: true,
        sub_options: { card: true, sbp: true, crypto: false },
        available_sub_options: [
          { id: 'card', name: 'Карта' },
          { id: 'sbp', name: 'СБП' },
          { id: 'crypto', name: 'Криптовалюта', is_provider_enabled: providerEnabled },
        ],
        default_min_amount_kopeks: 1000,
        default_max_amount_kopeks: 100000,
        min_amount_kopeks: null,
        max_amount_kopeks: null,
        is_provider_configured: true,
        user_type_filter: 'all',
        first_topup_filter: 'any',
        promo_group_filter_mode: 'all',
        allowed_promo_group_ids: [],
      },
    ],
    getPromoGroups: async () => [],
    update: (...args: unknown[]) => update(...args),
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([false, true])(
  'shows provider state %s and preserves cabinet preferences on save',
  async (enabled) => {
    providerEnabled = enabled;
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/admin/payment-methods/cispay/edit']}>
          <Routes>
            <Route
              path="/admin/payment-methods/:methodId/edit"
              element={<AdminPaymentMethodEdit />}
            />
            <Route path="/admin/payment-methods" element={<div>saved</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const crypto = await screen.findByRole('button', { name: 'Криптовалюта' });
    await waitFor(() => expect(crypto.getAttribute('aria-pressed')).toBe('false'));
    if (!enabled) {
      expect(screen.getByText('admin.paymentMethods.providerOptionDisabled')).toBeTruthy();
      expect(
        screen
          .getByRole('link', { name: 'admin.paymentMethods.providerSettings' })
          .getAttribute('href'),
      ).toBe('/admin/settings?section=payments_cispay');
    } else {
      expect(screen.queryByText('admin.paymentMethods.providerOptionDisabled')).toBeNull();
    }
    fireEvent.click(crypto);
    fireEvent.click(screen.getByRole('button', { name: 'admin.paymentMethods.saveButton' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        'cispay',
        expect.objectContaining({ sub_options: { card: true, sbp: true, crypto: true } }),
      ),
    );
  },
);
