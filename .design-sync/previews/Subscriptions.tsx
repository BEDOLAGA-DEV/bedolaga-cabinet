import { Subscriptions } from 'cabinet-frontend';
import { PageFrame, mockSubscriptionsList, mockTrialInfo, mockBalance } from '../page-harness';

export const Default = () => (
  <PageFrame
    route="/subscriptions"
    width={440}
    seed={[
      [['subscriptions-list'], mockSubscriptionsList],
      [['trial-info'], mockTrialInfo],
      [['balance'], mockBalance],
    ]}
  >
    <Subscriptions />
  </PageFrame>
);
