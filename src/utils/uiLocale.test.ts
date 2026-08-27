import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { uiLocale } from './uiLocale';

describe('uiLocale', () => {
  beforeAll(async () => {
    await i18next.init({ lng: 'ru', resources: {} });
  });

  it('маппит язык интерфейса в BCP-47 тег', async () => {
    await i18next.changeLanguage('en');
    expect(uiLocale()).toBe('en-US');
    await i18next.changeLanguage('zh');
    expect(uiLocale()).toBe('zh-CN');
    await i18next.changeLanguage('fa');
    expect(uiLocale()).toBe('fa-IR');
  });

  it('режет региональный суффикс языка', async () => {
    await i18next.changeLanguage('en-GB');
    expect(uiLocale()).toBe('en-US');
  });

  it('падает в ru-RU для неизвестного языка', async () => {
    await i18next.changeLanguage('xx');
    expect(uiLocale()).toBe('ru-RU');
  });

  it('дата форматируется по языку интерфейса, а не браузера', async () => {
    await i18next.changeLanguage('en');
    const date = new Date('2026-07-13T12:00:00Z');
    expect(date.toLocaleDateString(uiLocale(), { timeZone: 'UTC' })).toBe('7/13/2026');
    await i18next.changeLanguage('ru');
    expect(date.toLocaleDateString(uiLocale(), { timeZone: 'UTC' })).toBe('13.07.2026');
  });
});
