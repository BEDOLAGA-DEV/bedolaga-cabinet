import { describe, expect, it, vi } from 'vitest';
import { resolveConnectionUrlForUi } from './connectionLink';

// Keep connection resolution real; the encryption boundary returns distinguishable
// opaque payloads for the old and current URLs.
vi.mock('@kastov/cryptohapp', () => ({
  createHappCryptoLink: (url: string) =>
    url === 'https://new.example/sub/test'
      ? 'happ://crypt4/new-test-payload'
      : 'happ://crypt4/old-test-payload',
}));

describe('connection after a subscription domain change', () => {
  it('generates crypto from the current URL after the server invalidates the old link', () => {
    expect(
      resolveConnectionUrlForUi({
        mode: 'happ_cryptolink',
        subscriptionUrl: 'https://new.example/sub/test',
        displayLink: 'https://new.example/sub/test',
        happCryptoLink: null,
        fallbackUrl: 'https://old.example/sub/test',
      }),
    ).toBe('happ://crypt4/new-test-payload');
  });

  it('uses the regenerated server crypto link when present', () => {
    expect(
      resolveConnectionUrlForUi({
        mode: 'happ_cryptolink',
        subscriptionUrl: 'https://new.example/sub/test',
        happCryptoLink: 'happ://crypt5/new-test-payload',
      }),
    ).toBe('happ://crypt5/new-test-payload');
  });
});
