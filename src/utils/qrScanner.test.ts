import { describe, expect, it } from 'vitest';
import { parseGiftCode } from './qrScanner';

describe('parseGiftCode', () => {
  const token48 = 'a'.repeat(48);
  const token64 = 'a'.repeat(64);
  const urlSafeToken = 'a-B_c1234567890123456789012345678901234567890123456';

  it('reads canonical cabinet gift URL (/buy/gift/<token>)', () => {
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${token48}`)).toBe(token48);
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${token64}`)).toBe(token64);
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${urlSafeToken}`)).toBe(urlSafeToken);
    expect(parseGiftCode(`/buy/gift/${token48}`)).toBe(token48);
  });

  it('handles canonical URL with trailing slash, query string, or hash', () => {
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${token48}/`)).toBe(token48);
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${token48}?ref=qr`)).toBe(token48);
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${token48}#section`)).toBe(token48);
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${token48}/?utm_source=qr#claim`)).toBe(
      token48,
    );
  });

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

  it('rejects /buy/gift/ without token or with invalid token length', () => {
    expect(parseGiftCode('https://cab.example.com/buy/gift/')).toBeNull();
    expect(parseGiftCode('https://cab.example.com/buy/gift')).toBeNull();
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${'a'.repeat(47)}`)).toBeNull();
    expect(parseGiftCode(`https://cab.example.com/buy/gift/${'a'.repeat(65)}`)).toBeNull();
  });
});
