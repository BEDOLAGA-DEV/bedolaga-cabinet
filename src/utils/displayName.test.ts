import { describe, expect, it } from 'vitest';
import { displayName } from './displayName';

describe('displayName', () => {
  it('returns empty string for missing user', () => {
    expect(displayName(undefined)).toBe('');
    expect(displayName(null)).toBe('');
  });

  it('combines first_name and last_name', () => {
    expect(displayName({ first_name: 'Иван', last_name: 'Петров' })).toBe('Иван Петров');
    expect(displayName({ first_name: 'Иван', last_name: null })).toBe('Иван');
    expect(displayName({ first_name: null, last_name: 'Петров' })).toBe('Петров');
  });

  it('falls back to username when there is no name', () => {
    expect(displayName({ first_name: null, last_name: null, username: 'ivan' })).toBe('ivan');
  });

  it('falls back to telegram_id when there is no name and no username', () => {
    expect(displayName({ first_name: null, username: null, telegram_id: 123456 })).toBe('#123456');
  });

  it('falls back to the email local part for email-only users', () => {
    expect(
      displayName({
        first_name: null,
        last_name: null,
        username: null,
        telegram_id: null,
        email: 'vasya@gmail.com',
      }),
    ).toBe('vasya');
  });

  it('prefers telegram_id over email', () => {
    expect(displayName({ telegram_id: 123456, email: 'vasya@gmail.com' })).toBe('#123456');
  });

  it('returns empty string when every source is empty', () => {
    expect(
      displayName({
        first_name: '  ',
        last_name: null,
        username: null,
        telegram_id: null,
        email: null,
      }),
    ).toBe('');
  });
});
