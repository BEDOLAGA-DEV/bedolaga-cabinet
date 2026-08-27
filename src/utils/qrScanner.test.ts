import { describe, expect, it } from 'vitest';
import { parseGiftCode } from './qrScanner';

describe('parseGiftCode', () => {
  it('reads the bot deep link (main distribution path)', () => {
    expect(parseGiftCode('https://t.me/mybot?start=GIFT_abc123def456')).toBe('abc123def456');
  });

  it('reads the cabinet activation link', () => {
    expect(parseGiftCode('https://cab.example.com/gift?tab=activate&code=abc123def456')).toBe(
      'abc123def456',
    );
  });

  it('reads a bare code with and without the GIFT prefix', () => {
    expect(parseGiftCode('GIFT-abc123def456')).toBe('abc123def456');
    expect(parseGiftCode('abc123def456')).toBe('abc123def456');
    expect(parseGiftCode('  abc123def456  ')).toBe('abc123def456');
  });

  it('rejects unrelated QR content instead of filling the field with junk', () => {
    // Иначе сканер «распознал» бы любую ссылку и подставил мусор в поле кода
    expect(parseGiftCode('https://example.com/some/page')).toBeNull();
    expect(parseGiftCode('WIFI:S:MyNet;T:WPA;P:secret;;')).toBeNull();
    expect(parseGiftCode('short')).toBeNull();
    expect(parseGiftCode('')).toBeNull();
    expect(parseGiftCode(null)).toBeNull();
    expect(parseGiftCode(undefined)).toBeNull();
  });
});
