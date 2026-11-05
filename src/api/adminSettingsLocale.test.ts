import i18n from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { client } = vi.hoisted(() => ({
  client: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('./client', () => ({ default: client }));

import { adminSettingsApi, settingsMetadataLanguage } from './adminSettings';

const originalLanguage = i18n.language;
afterEach(() => {
  i18n.language = originalLanguage;
});

describe('settings metadata language', () => {
  it('uses a safe default before the app initializes i18next', () => {
    i18n.language = '';
    expect(settingsMetadataLanguage()).toBe('ru');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.language = 'fa-IR';
    for (const method of Object.values(client)) method.mockResolvedValue({ data: [] });
  });

  it.each([
    ['en-US', 'en'],
    ['zh-Hans', 'zh'],
    ['fa_IR', 'fa'],
    ['ru-RU', 'ru'],
    ['../../fa', 'ru'],
    ['invalid', 'ru'],
    ['en;q=1', 'ru'],
  ])('normalizes %s to %s', (source, expected) => {
    expect(settingsMetadataLanguage(source)).toBe(expected);
  });

  it('passes the active UI language for every read and write response', async () => {
    await adminSettingsApi.getCategories();
    await adminSettingsApi.getSettings('PAYMENT');
    await adminSettingsApi.getSetting('SALES_MODE');
    await adminSettingsApi.updateSetting('SALES_MODE', 'tariffs');
    await adminSettingsApi.resetSetting('SALES_MODE');

    expect(client.get).toHaveBeenNthCalledWith(1, '/cabinet/admin/settings/categories', {
      params: { language: 'fa' },
    });
    expect(client.get).toHaveBeenNthCalledWith(2, '/cabinet/admin/settings', {
      params: { language: 'fa', category_key: 'PAYMENT' },
    });
    expect(client.get).toHaveBeenNthCalledWith(3, '/cabinet/admin/settings/SALES_MODE', {
      params: { language: 'fa' },
    });
    expect(client.put).toHaveBeenCalledWith(
      '/cabinet/admin/settings/SALES_MODE',
      { value: 'tariffs' },
      { params: { language: 'fa' } },
    );
    expect(client.delete).toHaveBeenCalledWith('/cabinet/admin/settings/SALES_MODE', {
      params: { language: 'fa' },
    });
  });

  it('reads the new language after a switch instead of keeping an old default', async () => {
    await adminSettingsApi.getSettings();
    i18n.language = 'zh-CN';
    await adminSettingsApi.getSettings();
    expect(client.get).toHaveBeenLastCalledWith('/cabinet/admin/settings', {
      params: { language: 'zh' },
    });
  });
});
