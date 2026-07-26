import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath } from './safeRedirect';

describe('getSafeRedirectPath', () => {
  it('returns / for empty values', () => {
    expect(getSafeRedirectPath(null)).toBe('/');
    expect(getSafeRedirectPath(undefined)).toBe('/');
    expect(getSafeRedirectPath('')).toBe('/');
  });

  it('keeps plain absolute in-app paths', () => {
    expect(getSafeRedirectPath('/')).toBe('/');
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('/sub/page?tab=devices&x=1')).toBe('/sub/page?tab=devices&x=1');
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(getSafeRedirectPath('//evil.com')).toBe('/');
    expect(getSafeRedirectPath('https://evil.com/path')).toBe('/');
    expect(getSafeRedirectPath('http://evil.com')).toBe('/');
  });

  it('rejects non-path schemes', () => {
    expect(getSafeRedirectPath('javascript:alert(1)')).toBe('/');
    expect(getSafeRedirectPath('data:text/html,x')).toBe('/');
  });

  it('rejects URL-encoded host smuggling', () => {
    expect(getSafeRedirectPath('%2F%2Fevil.com')).toBe('/');
    expect(getSafeRedirectPath('/redirect%3A%2F%2Fevil.com')).toBe('/');
  });

  it('rejects malformed percent-encoding instead of throwing', () => {
    expect(getSafeRedirectPath('/%E0%A4%A')).toBe('/');
  });
});
