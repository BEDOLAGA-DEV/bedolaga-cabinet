import { Dashboard } from 'cabinet-frontend';
import {
  PageFrame,
  mockSubscriptionResponse,
  mockSubscriptionsList,
  mockTrialInfo,
  mockBalance,
} from '../page-harness';

export const Default = () => (
  <PageFrame
    route="/"
    width={440}
    seed={[
      [['balance'], mockBalance],
      [['subscriptions-list'], mockSubscriptionsList],
      [['subscription'], mockSubscriptionResponse],
      [['trial-info'], mockTrialInfo],
      [['devices'], { devices: [], total: 0, device_limit: 5 }],
      [['referral-info'], { referral_code: 'IVAN2026', total_earned: 350, invited_count: 4 }],
      [
        ['wheel-config'],
        { can_spin: false, prizes: [], spin_cost_stars: 0, spin_cost_stars_enabled: false },
      ],
      [['pending-gifts'], { gifts: [] }],
      [['promo-group-discounts'], { discounts: [] }],
    ]}
  >
    <Dashboard />
  </PageFrame>
);
