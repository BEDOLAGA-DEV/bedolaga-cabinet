// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { UserDetailResponse, UserSubscriptionInfo } from '@/api/adminUsers';
import { renderWithProviders } from '../dpichecker/testUtils';
import { SubscriptionTab, type SubscriptionTabProps } from './SubscriptionTab';

vi.mock('react-i18next', async () => (await import('../dpichecker/testUtils')).i18nMock());
vi.mock('./SubscriptionCard', () => ({ SubscriptionCard: () => null }));
vi.mock('./DevicesCard', () => ({ DevicesCard: () => null }));
vi.mock('@/api/adminUsers', () => ({
  adminUsersApi: { getSubscriptionRequestHistory: async () => ({ total: 0, records: [] }) },
}));
afterEach(cleanup);

type SubscriptionWithIdentity = UserSubscriptionInfo & { remnawave_id?: number | null };
const subscription = (id: number, panelId?: number | null): SubscriptionWithIdentity => ({
  id,
  remnawave_id: panelId,
  status: 'active',
  is_trial: false,
  start_date: '2026-01-01T00:00:00Z',
  end_date: '2027-01-01T00:00:00Z',
  traffic_limit_gb: 100,
  traffic_used_gb: 0,
  device_limit: 3,
  tariff_id: id,
  tariff_name: `Plan ${id}`,
  autopay_enabled: false,
  sbp_recurring_status: null,
  sbp_recurring_id: null,
  is_active: true,
  days_remaining: 30,
  purchased_traffic_gb: 0,
  traffic_purchases: [],
});
function Harness({
  subs,
  mode,
}: {
  subs: SubscriptionWithIdentity[];
  mode: SubscriptionTabProps['mode'];
}) {
  const [selected, select] = useState(subs[0].id);
  return (
    <SubscriptionTab
      userId={1}
      user={{ remnawave_id: 999, recent_transactions: [] } as unknown as UserDetailResponse}
      subscriptions={subs}
      selectedSub={subs.find((sub) => sub.id === selected) ?? null}
      onSelectSubscription={select}
      tariffs={[]}
      currentTariff={null}
      panelInfo={null}
      devices={[]}
      devicesLoading={false}
      nodeUsage={null}
      syncStatus={null}
      syncLoading={false}
      can={{ manage: false, sync: false, devices: false }}
      busy={false}
      actions={{} as SubscriptionTabProps['actions']}
      reachabilityLink={null}
      mode={mode}
    />
  );
}
it('shows the selected subscription panel ID when moving between two subscriptions', () => {
  renderWithProviders(
    <Harness mode="multi" subs={[subscription(101, 501), subscription(102, 502)]} />,
  );
  fireEvent.click(screen.getByText('Plan 101'));
  expect(screen.getByText('501')).toBeTruthy();
  expect(screen.queryByText('999')).toBeNull();
  fireEvent.click(screen.getByText('К списку подписок'));
  fireEvent.click(screen.getByText('Plan 102'));
  expect(screen.getByText('502')).toBeTruthy();
  expect(screen.queryByText('501')).toBeNull();
});
it.each([null, undefined])(
  'never substitutes another panel identity for a multi subscription with %s ID',
  (panelId) => {
    renderWithProviders(<Harness mode="multi" subs={[subscription(101, panelId)]} />);
    expect(screen.queryByText('999')).toBeNull();
  },
);
it.each(['classic', 'tariffs'] as const)(
  'keeps the legacy user identity fallback in %s mode',
  (mode) => {
    renderWithProviders(<Harness mode={mode} subs={[subscription(101)]} />);
    expect(screen.getByText('999')).toBeTruthy();
  },
);
