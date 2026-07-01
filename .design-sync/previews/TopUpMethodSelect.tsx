import { TopUpMethodSelect } from 'cabinet-frontend';
import { PageFrame, mockPaymentMethods } from '../page-harness';

export const Default = () => (
  <PageFrame route="/balance/top-up" width={440} seed={[[['payment-methods'], mockPaymentMethods]]}>
    <TopUpMethodSelect />
  </PageFrame>
);
