import { PurchaseSuccess } from 'cabinet-frontend';
import { PageFrame } from '../page-harness';

export const Default = () => (
  <PageFrame
    route="/buy/success/tok_demo"
    routePattern="/buy/success/:token"
    width={440}
    seed={[
      [
        ['purchase-status', 'tok_demo'],
        {
          status: 'delivered',
          is_paid: true,
          amount_rubles: 499,
          tariff_name: 'Premium',
          subscription_id: 1,
        },
      ],
    ]}
  >
    <PurchaseSuccess />
  </PageFrame>
);
