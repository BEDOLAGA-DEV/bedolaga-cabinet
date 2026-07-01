import { Balance } from 'cabinet-frontend';
import { PageFrame } from '../page-harness';

const tx = (id: number, type: string, rub: number, description: string, date: string) => ({
  id,
  type,
  amount_kopeks: Math.round(rub * 100),
  amount_rubles: rub,
  description,
  payment_method: null,
  is_completed: true,
  created_at: date,
  completed_at: date,
});

export const Default = () => (
  <PageFrame
    route="/balance"
    width={440}
    seed={[
      [['balance'], { balance_kopeks: 245000, balance_rubles: 2450 }],
      [
        ['transactions', 1],
        {
          items: [
            tx(1, 'DEPOSIT', 1000, 'Пополнение через СБП', '2026-06-28T12:00:00Z'),
            tx(
              2,
              'SUBSCRIPTION_PAYMENT',
              -499,
              'Подписка Premium, 1 месяц',
              '2026-06-20T09:30:00Z',
            ),
            tx(3, 'REFERRAL_REWARD', 150, 'Реферальный бонус', '2026-06-15T18:10:00Z'),
            tx(4, 'DEPOSIT', 2000, 'Пополнение картой', '2026-06-01T14:05:00Z'),
          ],
          total: 4,
          page: 1,
          per_page: 20,
          pages: 1,
        },
      ],
      [
        ['payment-methods'],
        [
          {
            id: 'sbp',
            name: 'СБП',
            description: 'Система быстрых платежей',
            min_amount_kopeks: 10000,
            max_amount_kopeks: 10000000,
            is_available: true,
          },
          {
            id: 'card',
            name: 'Банковская карта',
            description: 'Visa / MasterCard / МИР',
            min_amount_kopeks: 10000,
            max_amount_kopeks: 10000000,
            is_available: true,
          },
          {
            id: 'crypto',
            name: 'Криптовалюта',
            description: 'USDT, BTC, TON',
            min_amount_kopeks: 50000,
            max_amount_kopeks: 50000000,
            is_available: true,
          },
        ],
      ],
      [['saved-cards'], { recurrent_enabled: true, cards: [] }],
    ]}
  >
    <Balance />
  </PageFrame>
);
