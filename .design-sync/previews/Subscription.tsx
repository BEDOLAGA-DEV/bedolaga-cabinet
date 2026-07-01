import { Subscription } from 'cabinet-frontend';
import { PageFrame, mockSubscriptionResponse, mockSubscriptionsList } from '../page-harness';

// Route param subscriptionId is parseInt'd → query keys use the NUMBER 1.
// getSubscription returns SubscriptionStatusResponse ({ subscription }).
export const Default = () => (
  <PageFrame
    route="/subscriptions/1"
    routePattern="/subscriptions/:subscriptionId"
    width={440}
    seed={[
      [['subscriptions-list'], mockSubscriptionsList],
      [['subscription', 1], mockSubscriptionResponse],
      [
        ['connection-link', 1],
        {
          connect_mode: 'link',
          display_link: 'https://sub.example.com/abc123',
          subscription_url: 'https://sub.example.com/abc123',
          happ_link: 'happ://add/abc123',
        },
      ],
      [['purchase-options', 1], { traffic_options: [], period_options: [], devices_options: [] }],
      [
        ['devices', 1],
        {
          devices: [
            {
              hwid: 'dev-1',
              platform: 'iOS',
              device_model: 'iPhone 15',
              last_seen: '2026-06-29T10:00:00Z',
            },
            {
              hwid: 'dev-2',
              platform: 'Android',
              device_model: 'Pixel 8',
              last_seen: '2026-06-28T22:00:00Z',
            },
          ],
          total: 2,
          device_limit: 5,
        },
      ],
    ]}
  >
    <Subscription />
  </PageFrame>
);
