import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import ru from '@/locales/ru.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import fa from '@/locales/fa.json';

describe('mirror selector translations in real resources', () => {
  it.each([
    ['ru', ru, 'Основная'],
    ['en', en, 'Primary'],
    ['zh', zh, '主地址'],
    ['fa', fa, 'اصلی'],
  ] as const)('resolves root subscription keys in %s', async (language, resource, primary) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resource } },
    });
    expect(i18n.t('subscription.mirrors.primary')).toBe(primary);
    for (const key of ['choose', 'title', 'search', 'empty']) {
      expect(i18n.exists(`subscription.mirrors.${key}`)).toBe(true);
    }
    expect(i18n.t('subscription.mirrors.choose', { label: primary })).toContain(primary);
    expect(i18n.exists('wsNotifications.subscription.mirrors.primary')).toBe(false);
  });
});
