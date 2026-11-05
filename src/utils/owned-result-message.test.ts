import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import { localizeOwnedResultMessage } from './owned-result-message';
it('localizes owned contest prose while keeping a custom prize name verbatim', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'ru',
    resources: {
      ru: { translation: { apiResults: { contestWon: '🎉 Поздравляем! Вы выиграли! {{prize}}' } } },
    },
  });
  expect(
    localizeOwnedResultMessage('🎉 Congratulations! You won! Custom <Prize>', 'contest', i18n.t),
  ).toBe('🎉 Поздравляем! Вы выиграли! Custom <Prize>');
});

import en from '../locales/en.json';
import fa from '../locales/fa.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
const resources = { ru, en, zh, fa };
const exactCases = [
  ['contest', 'Empty node', 'emptyNode'],
  ['contest', 'Wrong server', 'wrongServer'],
  ['contest', 'Try another', 'tryAnother'],
  ['contest', 'Locked', 'locked'],
  ['contest', 'No access', 'noAccess'],
  ['contest', 'Try again', 'tryAgain'],
  ['contest', 'Server overloaded', 'serverOverloaded'],
  ['contest', 'No response', 'noResponse'],
  ['contest', 'Try tomorrow', 'tryTomorrow'],
  ['contest', 'Incorrect', 'incorrect'],
  ['contest', 'Try again next round', 'tryNextRound'],
  ['sync', 'Sync from panel completed', 'syncFromPanel'],
  ['sync', 'Sync to panel completed', 'syncToPanel'],
  ['sync', 'Full sync completed', 'syncFull'],
  ['sync', 'Servers synced successfully', 'syncServers'],
  ['sync', 'Subscriptions validated', 'validated'],
  ['sync', 'Cleanup completed', 'cleanup'],
  ['sync', 'Subscription statuses synced', 'statusesSynced'],
  ['sync', 'Recommendations retrieved', 'recommendations'],
  ['sync', 'Auto sync enabled and scheduled', 'autoSyncEnabled'],
  ['sync', 'Auto sync setting change requested. Restart may be required.', 'autoSyncRequested'],
  ['sync', 'No change needed', 'noChange'],
  ['sync', 'Failed', 'failed'],
  ['promo', 'Test access activated until unlimited', 'testUnlimited'],
] as const;
it.each(Object.keys(resources) as (keyof typeof resources)[])(
  'renders audited success-result text in %s without inferring outcomes',
  async (language) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resources[language] } },
      interpolation: { escapeValue: false },
    });
    for (const [scope, raw, key] of exactCases) {
      expect(i18n.exists(`apiResults.${key}`)).toBe(true);
      expect(localizeOwnedResultMessage(raw, scope, i18n.t)).toBe(i18n.t(`apiResults.${key}`));
      expect(localizeOwnedResultMessage(`${raw}: custom diagnostic`, scope, i18n.t)).toBe(
        `${raw}: custom diagnostic`,
      );
    }
    const prizeCases = [
      ['Subscription extended by 17 days', 'prizeDays', { days: '17' }],
      ['Balance increased by 123.45', 'prizeBalance', { amount: '123.45' }],
      ['Balance increased by 1.2e-05', 'prizeBalance', { amount: '1.2e-05' }],
      ['Error: invalid prize value', 'invalidPrize', {}],
      ['Error: subscription not found', 'prizeNoSubscription', {}],
      ['Error: user not found', 'prizeNoUser', {}],
      ["Prize type 'custom <Prize>' not supported", 'prizeUnsupported', { type: 'custom <Prize>' }],
    ] as const;
    for (const [prize, key, params] of prizeCases) {
      expect(i18n.exists(`apiResults.${key}`)).toBe(true);
      expect(
        localizeOwnedResultMessage(`🎉 Congratulations! You won! ${prize}`, 'contest', i18n.t),
      ).toBe(i18n.t('apiResults.contestWon', { prize: i18n.t(`apiResults.${key}`, params) }));
    }
    const until = '2026-11-07 17:04';
    expect(
      localizeOwnedResultMessage(`Test access activated until ${until}`, 'promo', i18n.t),
    ).toBe(i18n.t('apiResults.testUntil', { until }));
    expect(localizeOwnedResultMessage('Discount of 17% activated!', 'promo', i18n.t)).toBe(
      i18n.t('apiResults.discount', { percent: '17' }),
    );
    expect(
      localizeOwnedResultMessage(
        `Discount of 17% activated! Valid until ${until}`,
        'promo',
        i18n.t,
      ),
    ).toBe(i18n.t('apiResults.discountUntil', { percent: '17', until }));
    expect(
      localizeOwnedResultMessage('Synced: 1 created, 2 updated, 3 removed', 'servers', i18n.t),
    ).toBe(i18n.t('apiResults.serversSynced', { created: '1', updated: '2', removed: '3' }));
    expect(
      localizeOwnedResultMessage('Sync from panel completed with 7 errors', 'sync', i18n.t),
    ).toBe(i18n.t('apiResults.syncWithErrors', { count: '7' }));
    for (const prize of [
      'Custom <Prize> & reward',
      '{{token}} $t(apiResults.failed)',
      'نام جایزه',
    ]) {
      expect(
        localizeOwnedResultMessage(`🎉 Congratulations! You won! ${prize}`, 'contest', i18n.t),
      ).toContain(prize);
    }
    for (const scope of ['contest', 'promo', 'servers', 'sync'] as const) {
      for (const raw of [
        'External diagnostic <b>original</b>',
        'Operator custom description',
        'Discount of 17% activated! Extra detail',
        'Synced: -1 created, 2 updated, 3 removed',
      ])
        expect(localizeOwnedResultMessage(raw, scope, i18n.t)).toBe(raw);
    }
    expect(localizeOwnedResultMessage('Wrong server', 'sync', i18n.t)).toBe('Wrong server');
    expect(localizeOwnedResultMessage('Sync from panel completed', 'contest', i18n.t)).toBe(
      'Sync from panel completed',
    );
  },
);
it('preserves the full original success message when translations are absent', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', fallbackLng: false, resources: { en: { translation: {} } } });
  for (const [scope, raw] of exactCases)
    expect(localizeOwnedResultMessage(raw, scope, i18n.t)).toBe(raw);
  const raw = '🎉 Congratulations! You won! Balance increased by 12.5';
  expect(localizeOwnedResultMessage(raw, 'contest', i18n.t)).toBe(raw);
});
