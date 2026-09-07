// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';
import { DEFAULT_SNI_HOST, recallSniHosts, rememberSniHosts } from './sniNames';

/** Поле «SNI-хост» помнит последний ввод, как настройки пользователя в оригинале. */

beforeEach(() => {
  localStorage.clear();
  resetSafeStorage();
});

describe('SNI-хост: память поля', () => {
  it('без памяти — null (форма подставит белый домен по умолчанию), после ввода — введённое', () => {
    expect(recallSniHosts()).toBeNull();
    expect(DEFAULT_SNI_HOST).toBe('ads.x5.ru');
    rememberSniHosts('vk.com, ads.x5.ru');
    expect(recallSniHosts()).toBe('vk.com, ads.x5.ru');
    rememberSniHosts('   ');
    expect(recallSniHosts()).toBeNull();
  });
});
