import { describe, expect, it } from 'vitest';
import { isValidEmail } from './validation';

describe('isValidEmail', () => {
  it('accepts common addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+tag@sub.domain.io')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('plain')).toBe(false);
    expect(isValidEmail('user@host')).toBe(false);
    expect(isValidEmail('user @example.com')).toBe(false);
    expect(isValidEmail('user@exa mple.com')).toBe(false);
  });
});
