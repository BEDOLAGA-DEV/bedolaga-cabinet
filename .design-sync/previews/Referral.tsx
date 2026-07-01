import { Referral } from 'cabinet-frontend';
import { PageFrame } from '../page-harness';

export const Default = () => (
  <PageFrame
    route="/referral"
    width={440}
    seed={[
      [
        ['referral-info'],
        {
          referral_code: 'IVAN2026',
          referral_link: 'https://t.me/bedolaga_bot?start=IVAN2026',
          total_earned: 350,
          total_earned_rubles: 350,
          invited_count: 4,
          active_count: 3,
        },
      ],
      [
        ['referral-terms'],
        {
          is_enabled: true,
          title: 'Реферальная программа',
          commission: 10,
          commission_percent: 10,
          first_topup_bonus_kopeks: 5000,
          first_topup_bonus_rubles: 50,
          inviter_bonus_kopeks: 15000,
          inviter_bonus_rubles: 150,
          minimum_topup_rubles: 100,
          partner_section_visible: true,
        },
      ],
      [
        ['referral-list'],
        {
          items: [
            {
              id: 1,
              name: 'Пользователь #8842',
              joined_at: '2026-06-10T00:00:00Z',
              earned_rubles: 150,
              status: 'active',
            },
            {
              id: 2,
              name: 'Пользователь #9021',
              joined_at: '2026-06-18T00:00:00Z',
              earned_rubles: 100,
              status: 'active',
            },
            {
              id: 3,
              name: 'Пользователь #9110',
              joined_at: '2026-06-25T00:00:00Z',
              earned_rubles: 100,
              status: 'active',
            },
          ],
          total: 3,
          page: 1,
          pages: 1,
        },
      ],
      [['referral-earnings'], { total_rubles: 350, this_month_rubles: 200, items: [] }],
      [['branding'], { app_name: 'Bedolaga Cabinet', logo_url: '' }],
      [['partner-status'], { is_partner: false, can_apply: true }],
      [
        ['withdrawal-balance'],
        {
          available_total: 35000,
          pending: 0,
          referral_spent: 0,
          total_earned: 35000,
          withdrawn: 0,
          min_amount_kopeks: 50000,
          can_request: false,
          cannot_request_reason: 'min_amount',
        },
      ],
      [['withdrawal-history'], { items: [], total: 0 }],
    ]}
  >
    <Referral />
  </PageFrame>
);
