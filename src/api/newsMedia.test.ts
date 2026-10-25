import { beforeEach, describe, expect, it, vi } from 'vitest';
const { client } = vi.hoisted(() => ({
  client: {
    defaults: { baseURL: '/api' },
    getUri: ({ url }: { url: string }) => `${client.defaults.baseURL}${url}`,
  },
}));
vi.mock('./client', () => ({ default: client }));
import { resolveNewsMediaUrl, resolveNewsMediaContent } from './newsMedia';

describe('news media behind the API proxy', () => {
  beforeEach(() => {
    client.defaults.baseURL = '/api';
  });
  it('routes both legacy and current upload paths through the configured API', () => {
    expect(resolveNewsMediaUrl('/uploads/images/a.jpg')).toBe('/api/cabinet/uploads/images/a.jpg');
    expect(resolveNewsMediaUrl('/cabinet/uploads/videos/a.mp4')).toBe(
      '/api/cabinet/uploads/videos/a.mp4',
    );
    expect(resolveNewsMediaUrl('/api/cabinet/uploads/images/a.jpg')).toBe(
      '/api/cabinet/uploads/images/a.jpg',
    );
  });
  it('uses an absolute API base for its own stored media only', () => {
    client.defaults.baseURL = 'https://api.example/v1';
    expect(resolveNewsMediaUrl('https://api.example/uploads/images/a.jpg')).toBe(
      'https://api.example/v1/cabinet/uploads/images/a.jpg',
    );
    expect(resolveNewsMediaUrl('https://cdn.example/uploads/images/a.jpg')).toBe(
      'https://cdn.example/uploads/images/a.jpg',
    );
  });
  it('resolves a trusted upload response even when the backend sees its internal host', () => {
    expect(resolveNewsMediaUrl('http://backend.example/cabinet/uploads/images/a.jpg', true)).toBe(
      '/api/cabinet/uploads/images/a.jpg',
    );
  });
  it('updates embedded media without touching links or external images', () => {
    expect(
      resolveNewsMediaContent(
        '<img src="/uploads/images/a.jpg"><video src="/uploads/videos/a.mp4" poster="/uploads/images/t.jpg"></video><a href="/uploads/images/a.jpg">link</a>',
      ),
    ).toBe(
      '<img src="/api/cabinet/uploads/images/a.jpg"><video src="/api/cabinet/uploads/videos/a.mp4" poster="/api/cabinet/uploads/images/t.jpg"></video><a href="/uploads/images/a.jpg">link</a>',
    );
  });
});
