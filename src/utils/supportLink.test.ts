import { describe, expect, it } from 'vitest';
import { resolveSupportLink } from './supportLink';

describe('resolveSupportLink', () => {
  it('returns null when there is nothing to open', () => {
    expect(resolveSupportLink(null)).toBeNull();
    expect(resolveSupportLink(undefined)).toBeNull();
    expect(resolveSupportLink({})).toBeNull();
    expect(resolveSupportLink({ support_username: '   ' })).toBeNull();
  });

  it('prefers the server-resolved url over the username', () => {
    expect(
      resolveSupportLink({
        support_url: 'https://help.example.com',
        support_username: '@help',
        contact_is_telegram: false,
      }),
    ).toEqual({ url: 'https://help.example.com', isTelegram: false });
  });

  it('marks telegram links so they open natively', () => {
    expect(
      resolveSupportLink({
        support_url: 'https://t.me/help',
        support_username: '@help',
        contact_is_telegram: true,
      }),
    ).toEqual({ url: 'https://t.me/help', isTelegram: true });
  });

  it('accepts tg:// deep links', () => {
    expect(
      resolveSupportLink({ support_url: 'tg://resolve?domain=help', contact_is_telegram: true }),
    ).toEqual({ url: 'tg://resolve?domain=help', isTelegram: true });
  });

  it('treats a missing contact_is_telegram as external', () => {
    expect(resolveSupportLink({ support_url: 'https://help.example.com' })).toEqual({
      url: 'https://help.example.com',
      isTelegram: false,
    });
  });

  it('rejects exotic schemes', () => {
    expect(resolveSupportLink({ support_url: 'javascript:alert(1)' })).toBeNull();
    expect(resolveSupportLink({ support_url: 'data:text/html,x' })).toBeNull();
    expect(resolveSupportLink({ support_url: 'not a url' })).toBeNull();
  });

  it('falls back to building a t.me link for older backends', () => {
    expect(resolveSupportLink({ support_username: '@help' })).toEqual({
      url: 'https://t.me/help',
      isTelegram: true,
    });
    expect(resolveSupportLink({ support_username: 'help' })).toEqual({
      url: 'https://t.me/help',
      isTelegram: true,
    });
  });

  it('does not build t.me links out of url-shaped usernames', () => {
    expect(resolveSupportLink({ support_username: 'https://help.example.com' })).toBeNull();
    expect(resolveSupportLink({ support_username: 'help.example.com' })).toBeNull();
  });
});
