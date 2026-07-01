import { Profile } from 'cabinet-frontend';
import { PageFrame } from '../page-harness';

export const Default = () => (
  <PageFrame
    route="/profile"
    width={440}
    seed={[
      [['referral-info'], { referral_code: 'IVAN2026', total_earned: 350, invited_count: 4 }],
      [['referral-terms'], { reward_percent: 10, min_withdrawal: 500 }],
      [['branding'], { app_name: 'Bedolaga Cabinet', logo_url: '', support_url: '' }],
      [['email-auth-enabled'], { enabled: true }],
      [
        ['notification-settings'],
        { subscription_expiry: true, payment: true, promo: false, news: true },
      ],
    ]}
  >
    <Profile />
  </PageFrame>
);
