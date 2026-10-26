// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each(['', '/api', '/api/', 'https://api.example/v1/'])(
  'resolves signed ticket media and logo against the API base %j',
  async (base) => {
    vi.stubEnv('VITE_API_URL', base);
    vi.resetModules();
    const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image']) });
    vi.stubGlobal('fetch', fetch);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test-logo'),
    });
    const { default: client } = await import('./client');
    const { ticketsApi } = await import('./tickets');
    const { preloadLogo } = await import('./branding');
    const expectedBase = (base || '/api').replace(/\/$/, '');
    expect(client.getUri({ url: '/cabinet/media/file-id' })).toBe(
      `${expectedBase}/cabinet/media/file-id`,
    );
    expect(ticketsApi.getMediaUrl('file-id', 'signed+/=')).toBe(
      `${expectedBase}/cabinet/media/file-id?token=signed%2B%2F%3D`,
    );
    expect(ticketsApi.getMediaUrl('file-id')).toBe(`${expectedBase}/cabinet/media/file-id`);
    await preloadLogo({
      name: 'Example',
      logo_letter: 'E',
      has_custom_logo: true,
      logo_url: '/cabinet/branding/logo',
    });
    expect(fetch).toHaveBeenCalledWith(`${expectedBase}/cabinet/branding/logo`);
  },
);

it('preserves an absolute logo URL instead of prefixing the backend origin', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example/api');
  vi.resetModules();
  const fetch = vi.fn().mockResolvedValue({ ok: false });
  vi.stubGlobal('fetch', fetch);
  const { preloadLogo } = await import('./branding');
  await preloadLogo({
    name: 'Example',
    logo_letter: 'E',
    has_custom_logo: true,
    logo_url: 'https://assets.example/logo.png',
  });
  expect(fetch).toHaveBeenCalledWith('https://assets.example/logo.png');
});
