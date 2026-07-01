import { Info } from 'cabinet-frontend';
import { PageFrame } from '../page-harness';

export const Default = () => (
  <PageFrame
    route="/info"
    width={440}
    seed={[
      [['info-pages', 'tab-replacements'], []],
      [
        ['info-pages', 'list'],
        [
          { slug: 'about', title: 'О сервисе', icon: 'info', replaces_tab: null },
          { slug: 'setup', title: 'Как настроить', icon: 'settings', replaces_tab: null },
        ],
      ],
      [
        ['faq-pages'],
        [
          {
            id: 1,
            question: 'Как подключить VPN?',
            answer: 'Откройте раздел «Подключение» и следуйте инструкции.',
          },
          {
            id: 2,
            question: 'Что делать, если не работает?',
            answer: 'Смените локацию или перезапустите приложение.',
          },
        ],
      ],
      [['rules'], { content: '<p>Правила использования сервиса.</p>', title: 'Правила' }],
      [
        ['privacy-policy'],
        { content: '<p>Политика конфиденциальности.</p>', title: 'Конфиденциальность' },
      ],
      [['public-offer'], { content: '<p>Публичная оферта.</p>', title: 'Оферта' }],
      [['personal-data-consent'], { content: '<p>Согласие на обработку данных.</p>' }],
      [
        ['loyalty-tiers'],
        {
          tiers: [
            { name: 'Bronze', threshold: 0 },
            { name: 'Silver', threshold: 1000 },
            { name: 'Gold', threshold: 5000 },
          ],
        },
      ],
    ]}
  >
    <Info />
  </PageFrame>
);
