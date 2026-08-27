import { describe, expect, it } from 'vitest';
import { isOAuthConsentRequiredStatus428 } from './oauth';

describe('isOAuthConsentRequiredStatus428', () => {
  it('returns true only for HTTP 428 status from unknown errors', () => {
    const err = { response: { status: 428 } };
    expect(isOAuthConsentRequiredStatus428(err)).toBe(true);
  });

  it('returns false for non-428 statuses', () => {
    expect(isOAuthConsentRequiredStatus428({ response: { status: 400 } })).toBe(false);
    expect(isOAuthConsentRequiredStatus428({ response: { status: 401 } })).toBe(false);
    expect(isOAuthConsentRequiredStatus428({ response: { status: 500 } })).toBe(false);
  });

  it('returns false for malformed or unrelated values', () => {
    expect(isOAuthConsentRequiredStatus428(null)).toBe(false);
    expect(isOAuthConsentRequiredStatus428(undefined)).toBe(false);
    expect(isOAuthConsentRequiredStatus428({})).toBe(false);
    expect(isOAuthConsentRequiredStatus428({ response: null })).toBe(false);
    expect(isOAuthConsentRequiredStatus428({ response: { status: '428' } })).toBe(false);
    expect(isOAuthConsentRequiredStatus428(new Error('boom'))).toBe(false);
  });
});
