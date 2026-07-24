import { afterEach, describe, expect, it, vi } from 'vitest';
import { openAppScheme } from './openAppScheme';

// openAppScheme touches window/document/navigator; the suite runs in a plain node
// environment, so stub just enough of the DOM to observe which launch path is taken.
interface FakeIframe {
  style: { display: string };
  src: string;
  remove: () => void;
}

function setup(nav: { userAgent?: string; platform?: string; maxTouchPoints?: number }) {
  const location = { href: '' };
  const createdIframes: FakeIframe[] = [];

  vi.stubGlobal('navigator', {
    userAgent: nav.userAgent ?? '',
    platform: nav.platform ?? '',
    maxTouchPoints: nav.maxTouchPoints ?? 0,
  });
  vi.stubGlobal('window', {
    location,
    setTimeout: () => 0,
  });
  vi.stubGlobal('document', {
    body: { appendChild: () => undefined },
    createElement: () => {
      const iframe: FakeIframe = { style: { display: '' }, src: '', remove: () => undefined };
      createdIframes.push(iframe);
      return iframe;
    },
  });

  return { location, createdIframes };
}

describe('openAppScheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('navigates directly for http(s) links (no iframe)', () => {
    const { location, createdIframes } = setup({ userAgent: 'Mozilla/5.0 (Android)' });
    openAppScheme('https://example.com/sub');
    expect(location.href).toBe('https://example.com/sub');
    expect(createdIframes).toHaveLength(0);
  });

  it('opens a custom scheme via top-level navigation on iOS (iPhone), not via iframe', () => {
    const { location, createdIframes } = setup({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1',
    });
    openAppScheme('incy://import/https://sp.example.com/abc');
    // iOS ignores iframe scheme launches — must be a real top-level navigation.
    expect(location.href).toBe('incy://import/https://sp.example.com/abc');
    expect(createdIframes).toHaveLength(0);
  });

  it('treats touch-capable iPadOS (reports as Mac) as iOS', () => {
    const { location, createdIframes } = setup({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    });
    openAppScheme('happ://add/https://sp.example.com/abc');
    expect(location.href).toBe('happ://add/https://sp.example.com/abc');
    expect(createdIframes).toHaveLength(0);
  });

  it('uses a contained iframe for custom schemes on Android (keeps page alive)', () => {
    const { location, createdIframes } = setup({
      userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120',
    });
    openAppScheme('incy://import/https://sp.example.com/abc');
    // Android in-app browsers would paint a full-page error on a top-level nav.
    expect(location.href).toBe('');
    expect(createdIframes).toHaveLength(1);
    expect(createdIframes[0].src).toBe('incy://import/https://sp.example.com/abc');
  });

  it('treats a non-touch Mac (desktop Safari) as non-iOS', () => {
    const { createdIframes } = setup({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    });
    openAppScheme('incy://import/https://sp.example.com/abc');
    expect(createdIframes).toHaveLength(1);
  });
});
