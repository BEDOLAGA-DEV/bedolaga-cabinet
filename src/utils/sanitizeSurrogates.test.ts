import { describe, expect, it } from 'vitest';
import { sanitizeSurrogates } from './sanitizeSurrogates';

describe('sanitizeSurrogates', () => {
  it('returns surrogate-free strings unchanged', () => {
    expect(sanitizeSurrogates('')).toBe('');
    expect(sanitizeSurrogates('https://host/sub/uuid#remark')).toBe('https://host/sub/uuid#remark');
  });

  it('keeps valid surrogate pairs intact', () => {
    expect(sanitizeSurrogates('server 😀 name')).toBe('server 😀 name');
  });

  it('replaces a lone high surrogate', () => {
    expect(sanitizeSurrogates('abc\uD83D')).toBe('abc�');
    expect(sanitizeSurrogates('\uD83Dxyz')).toBe('�xyz');
  });

  it('replaces a lone low surrogate', () => {
    expect(sanitizeSurrogates('abc\uDE00def')).toBe('abc�def');
  });

  it('makes a truncated-emoji string safe for encodeURI', () => {
    const broken = 'remark \uD83D truncated';
    expect(() => encodeURI(broken)).toThrow();
    expect(() => encodeURI(sanitizeSurrogates(broken))).not.toThrow();
  });
});
