import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import fa from '../../locales/fa.json';
import ru from '../../locales/ru.json';
import zh from '../../locales/zh.json';
import { formatSettingKey } from './utils';

// Representative display_name values from the backend setting registry. These are
// Title Case API names, not the historical lowerCamelCase locale aliases.
const displayNames = [
  'Invite Only Enabled',
  'Support Admin Ticket Notifications Enabled',
  'Admin Notifications Purchases Topic Id',
  'Grace Access Allowed Services',
  'Tariff Switch Reset Free Days',
  'Telegram Oidc Enabled',
  'Telegram Oidc Client Id',
  'Telegram Oidc Client Secret',
  'Cispay Recurrent Enabled',
  'Overpay Int Min Eur',
  'Apple Iap Rate Limit Fail Open',
  'Cabinet Email Change Code Expire Minutes',
  'Oauth Google Client Id',
  'Ban Msg Enabled',
  'Dpichecker Reference Subscription',
];

const resources = { ru, en, zh, fa };

describe('runtime setting display names', () => {
  it.each(Object.keys(resources) as (keyof typeof resources)[])(
    'resolves canonical API names directly in %s without a fallback locale',
    async (language) => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        fallbackLng: false,
        resources: { [language]: { translation: resources[language] } },
      });
      for (const name of displayNames) {
        const key = `admin.settings.settingNames.${formatSettingKey(name)}`;
        expect(i18n.exists(key), `${language}: ${name}`).toBe(true);
        const translated = i18n.t(key, { defaultValue: name });
        expect(translated).not.toBe(name);
        if (language !== 'ru') expect(translated).not.toMatch(/[А-Яа-яЁё]/);
      }
    },
  );

  it('keeps permission and notification labels distinct from API field names', () => {
    expect(en.admin.settings.settingNames['Ban Msg Enabled']).toBe('Unban message');
    expect(en.admin.settings.settingNames['Grace Access Allowed Services']).toBe(
      'Description of services available during grace access',
    );
    expect(en.admin.settings.settingNames['Tariff Switch Reset Free Days']).toBe(
      'Discard free days on tariff switch',
    );
  });
});
