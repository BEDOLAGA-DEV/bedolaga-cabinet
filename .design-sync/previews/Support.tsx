import { Support } from 'cabinet-frontend';
import { PageFrame } from '../page-harness';

export const Default = () => (
  <PageFrame
    route="/support"
    width={440}
    seed={[
      [['support-config'], { enabled: true, support_url: '', mode: 'tickets' }],
      [
        ['tickets'],
        {
          items: [
            {
              id: 101,
              subject: 'Не подключается VPN',
              status: 'open',
              created_at: '2026-06-29T09:00:00Z',
              last_message_at: '2026-06-29T12:00:00Z',
            },
            {
              id: 102,
              subject: 'Вопрос по оплате',
              status: 'closed',
              created_at: '2026-06-20T14:00:00Z',
              last_message_at: '2026-06-21T10:00:00Z',
            },
          ],
          total: 2,
          page: 1,
          pages: 1,
        },
      ],
    ]}
  >
    <Support />
  </PageFrame>
);
