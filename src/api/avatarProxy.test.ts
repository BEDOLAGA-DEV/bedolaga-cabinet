import { describe, expect, it, vi } from 'vitest';
const { get, getUri } = vi.hoisted(() => ({
  get: vi.fn(),
  getUri: vi.fn(({ url }: { url: string }) => `/api${url}`),
}));
vi.mock('./client', () => ({ default: { get, getUri } }));
import { authApi } from './auth';
describe('avatar API proxy', () => {
  it('keeps the signed token and uses the same API base as the avatar request', async () => {
    get.mockResolvedValue({
      data: { photo_url: 'https://cabinet.example/cabinet/media/masked-file?token=masked-token' },
    });
    expect((await authApi.getMyAvatar()).photo_url).toBe(
      '/api/cabinet/media/masked-file?token=masked-token',
    );
  });
  it('leaves an absent avatar absent', async () => {
    get.mockResolvedValue({ data: { photo_url: null } });
    expect((await authApi.getMyAvatar()).photo_url).toBeNull();
  });
});
