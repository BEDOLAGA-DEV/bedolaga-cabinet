import { Wheel } from 'cabinet-frontend';
import { PageFrame } from '../page-harness';

const prize = (id: number, label: string, type: string) => ({
  id,
  label,
  name: label,
  reward_type: type,
  value: id * 50,
});

export const Default = () => (
  <PageFrame
    route="/wheel"
    width={440}
    seed={[
      [
        ['wheel-config'],
        {
          is_enabled: true,
          can_spin: true,
          spin_cost_stars: 0,
          spin_cost_stars_enabled: false,
          spin_cost_days_enabled: false,
          spins_left: 1,
          prizes: [
            prize(1, '50 ₽', 'balance'),
            prize(2, '100 ₽', 'balance'),
            prize(3, '3 дня Premium', 'subscription'),
            prize(4, '200 ₽', 'balance'),
            prize(5, 'Пусто', 'nothing'),
            prize(6, '10 ГБ трафика', 'traffic'),
          ],
        },
      ],
      [['wheel-history'], { items: [], total: 0 }],
    ]}
  >
    <Wheel />
  </PageFrame>
);
