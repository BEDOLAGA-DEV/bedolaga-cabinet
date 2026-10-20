// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import type { PurchaseStatus } from '../api/landings';
import PurchaseSuccess from './PurchaseSuccess';

const state = vi.hoisted(() => ({ status: 'delivered' as PurchaseStatus['status'] }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

function delivered(): PurchaseStatus {
  return {
    status: 'delivered',
    subscription_url: 'https://vpn.example/sub/test',
    subscription_crypto_link: null,
    is_gift: false,
    contact_value: 'b***@example.com',
    recipient_contact_value: null,
    period_days: 30,
    tariff_name: 'Test',
    gift_message: null,
    contact_type: 'email',
    cabinet_email: 'buyer@example.com',
    cabinet_password: null,
    auto_login_token: null,
    recipient_in_bot: null,
    bot_link: null,
    is_claimable: false,
    claim_url: null,
    bot_claim_link: null,
  };
}
vi.mock('../api/landings', () => ({
  landingApi: {
    getPurchaseStatus: async () => ({ ...delivered(), status: state.status }),
    activatePurchase: async () => delivered(),
  },
}));

afterEach(cleanup);

function mount(status: PurchaseStatus['status']) {
  state.status = status;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/purchase/test-token']}>
        <Routes>
          <Route path="/purchase/:token" element={<PurchaseSuccess />} />
          <Route path="/login" element={<h1>Login screen</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

it('delivered purchase for an existing email leads to login without issuing new credentials', async () => {
  const client = mount('delivered');
  expect(await screen.findByRole('heading', { name: 'landing.cabinetReady' })).toBeTruthy();
  expect(screen.getByText('buyer@example.com')).toBeTruthy();
  expect(screen.queryByText('landing.cabinetPassword')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'landing.goToCabinet' }));
  expect(await screen.findByRole('heading', { name: 'Login screen' })).toBeTruthy();
  client.clear();
});

it('keeps a paid purchase awaiting confirmation usable and replaces it with the delivered result', async () => {
  const client = mount('pending_activation');
  expect(await screen.findByRole('heading', { name: 'landing.pendingActivation' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'landing.cabinetReady' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'landing.activateNow' }));
  expect(await screen.findByRole('heading', { name: 'landing.cabinetReady' })).toBeTruthy();
  expect(screen.getByText('buyer@example.com')).toBeTruthy();
  client.clear();
});
