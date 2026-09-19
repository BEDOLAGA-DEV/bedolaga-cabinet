import { describe, expect, it, vi } from 'vitest';

/**
 * The wire between the cabinet button and the bot setting.
 *
 * The page test mocks `@/api/partners` wholesale, and the bot-side test calls the
 * endpoint function directly — so the URL and the request body were checked from
 * neither end. Mutating the path to `.../referral-levels-modeX` or the body to
 * `{ mode }` left all 407 tests green while the switch silently stopped working.
 */

const patch = vi.fn((_url: string, _body?: unknown) =>
  Promise.resolve({ data: { levels_mode: 'tiers' } }),
);

vi.mock('./client', () => ({
  default: { patch, get: vi.fn(), post: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));

describe('updateReferralLevelsMode', () => {
  it('шлёт PATCH на тот путь и с тем ключом, которые понимает бот', async () => {
    const { partnerApi } = await import('./partners');
    patch.mockClear();

    await partnerApi.updateReferralLevelsMode('tiers');

    expect(patch).toHaveBeenCalledTimes(1);
    const [url, body] = patch.mock.calls[0];
    expect(url).toBe('/cabinet/admin/partners/referral-levels-mode');
    expect(body).toEqual({ levels_mode: 'tiers' });
  });

  it('передаёт обратное направление без подмены', async () => {
    const { partnerApi } = await import('./partners');
    patch.mockClear();

    await partnerApi.updateReferralLevelsMode('chain');

    const [, body] = patch.mock.calls[0];
    expect(body).toEqual({ levels_mode: 'chain' });
  });
});
