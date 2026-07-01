import { SubscriptionPurchase } from 'cabinet-frontend';
import {
  PageFrame,
  mockSubscriptionResponse,
  mockSubscriptionsList,
  mockBalance,
} from '../page-harness';

export const Default = () => (
  <PageFrame
    route="/subscription/purchase"
    width={440}
    seed={[
      [['subscription', undefined], mockSubscriptionResponse],
      [['subscriptions-list'], mockSubscriptionsList],
      [['balance'], mockBalance],
      [['active-discount'], { has_discount: false, percent: 0 }],
      [
        ['purchase-options', undefined],
        {
          sales_mode: 'tariffs',
          balance_kopeks: 245000,
          balance_label: '2450 ₽',
          current_tariff_id: 2,
          subscription_is_expired: false,
          has_subscription: true,
          tariffs: [
            {
              id: 1,
              name: 'Базовый',
              description: 'Для одного устройства',
              tier_level: 1,
              traffic_limit_gb: 50,
              traffic_limit_label: '50 ГБ',
              is_unlimited_traffic: false,
              device_limit: 2,
              extra_devices_count: 0,
              servers_count: 5,
              servers: [],
              periods: [
                {
                  id: 'p30',
                  days: 30,
                  label: '1 месяц',
                  price_kopeks: 19900,
                  price_label: '199 ₽',
                },
              ],
              is_current: false,
              is_available: true,
            },
            {
              id: 2,
              name: 'Premium',
              description: 'Безлимит и все локации',
              tier_level: 2,
              traffic_limit_gb: 200,
              traffic_limit_label: '200 ГБ',
              is_unlimited_traffic: false,
              device_limit: 5,
              extra_devices_count: 0,
              servers_count: 20,
              servers: [],
              periods: [
                {
                  id: 'p30',
                  days: 30,
                  label: '1 месяц',
                  price_kopeks: 49900,
                  price_label: '499 ₽',
                },
              ],
              is_current: true,
              is_available: true,
            },
          ],
        },
      ],
    ]}
  >
    <SubscriptionPurchase />
  </PageFrame>
);
