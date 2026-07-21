import { describe, expect, it } from 'vitest';
import type { SupportConfig } from '../types';
import { resolveSupportContact } from './supportContact';

/**
 * Кабинет склеивал `https://t.me/${support_username}` и ломал внешний хелпдеск:
 * SUPPORT_USERNAME принимает и `@user`, и произвольный URL, поэтому из
 * `https://help.example.com` получалось `https://t.me/https://help.example.com`.
 * Бэк отдаёт контакт уже разрезолвленным — клеить на клиенте больше нечего.
 *
 * resolveSupportContact дополнительно защищается от битого конфига: чужие схемы
 * (`javascript:` и т.п.) и URL-образный legacy-username не уводят в опенер, а
 * возвращают null — кнопку в таком случае не рендерим.
 */

const config = (overrides: Partial<SupportConfig>): SupportConfig => ({
  tickets_enabled: true,
  support_type: 'both',
  ...overrides,
});

describe('resolveSupportContact', () => {
  it('внешний хелпдеск открывается как обычная ссылка, без t.me', () => {
    const target = resolveSupportContact(
      config({
        support_url: 'https://help.example.com',
        support_username: 'https://help.example.com',
        contact_is_telegram: false,
      }),
    );

    expect(target).toEqual({ kind: 'external', url: 'https://help.example.com' });
    expect(target?.url).not.toContain('t.me');
  });

  it('телеграм-контакт открывается через telegram-ссылку', () => {
    const target = resolveSupportContact(
      config({
        support_url: 'https://t.me/help',
        support_username: '@help',
        contact_is_telegram: true,
      }),
    );

    expect(target).toEqual({ kind: 'telegram', url: 'https://t.me/help' });
  });

  it('tg:// deep link — валидная схема', () => {
    const target = resolveSupportContact(
      config({ support_url: 'tg://resolve?domain=help', contact_is_telegram: true }),
    );

    expect(target).toEqual({ kind: 'telegram', url: 'tg://resolve?domain=help' });
  });

  describe('чужие схемы в support_url отсекаются', () => {
    it.each([
      'javascript:alert(1)',
      'data:text/html,x',
      'not a url',
    ])('%s -> null', (support_url) => {
      expect(resolveSupportContact(config({ support_url }))).toBeNull();
    });
  });

  describe('старый бэк без support_url — прежнее поведение', () => {
    it.each([
      ['@help', 'https://t.me/help'],
      ['help', 'https://t.me/help'],
    ])('%s -> %s', (username, expected) => {
      const target = resolveSupportContact(config({ support_username: username }));

      expect(target).toEqual({ kind: 'telegram', url: expected });
    });

    it.each([
      'https://help.example.com',
      'help.example.com',
      't.me/help',
    ])('URL-образный legacy username (%s) не клеится в t.me — null', (support_username) => {
      expect(resolveSupportContact(config({ support_username }))).toBeNull();
    });

    it('контакт вообще не задан — кнопки нет (null, без дефолта @support)', () => {
      expect(resolveSupportContact(config({}))).toBeNull();
      expect(resolveSupportContact(config({ support_username: '   ' }))).toBeNull();
    });
  });

  it('support_url без contact_is_telegram трактуется как телеграм', () => {
    // Комбинация недостижима с текущим бэком, но деградировать надо в старое
    // поведение, а не в переход по внешней ссылке.
    const target = resolveSupportContact(config({ support_url: 'https://t.me/help' }));

    expect(target?.kind).toBe('telegram');
  });
});
