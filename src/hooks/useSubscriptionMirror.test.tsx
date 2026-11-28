// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSubscriptionMirror } from './useSubscriptionMirror';
import { safeLocal } from '@/utils/safeStorage';
const auth = vi.hoisted(() => ({ user: { id: 91 } }));
vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));
const main = 'https://primary.example/sub/secret';
const alternate = {
  id: '0123456789abcdef',
  label: 'Alt',
  url: 'https://mirror.example/sub/secret',
};
const data = { subscription_id: 17, connect_mode: 'guide', hide_link: false, mirrors: [alternate] };
afterEach(() => {
  cleanup();
  safeLocal.removeItem('subscription-mirror:91:17');
  auth.user.id = 91;
});
it('shares one choice across consumers while storing only the opaque ID', () => {
  const first = renderHook(() => useSubscriptionMirror(data, main));
  const second = renderHook(() => useSubscriptionMirror(data, main));
  act(() => first.result.current.select(alternate.id));
  expect(second.result.current.url).toBe(alternate.url);
  expect(safeLocal.getItem('subscription-mirror:91:17')).toBe(alternate.id);
  act(() => second.result.current.select(null));
  expect(first.result.current.url).toBe(main);
});
it('isolates users and subscriptions and derives current token after refresh', () => {
  const view = renderHook(({ payload }) => useSubscriptionMirror(payload, main), {
    initialProps: { payload: data },
  });
  act(() => view.result.current.select(alternate.id));
  view.rerender({ payload: { ...data, subscription_id: 18 } });
  expect(view.result.current.url).toBe(main);
  view.rerender({ payload: { ...data, mirrors: [{ ...alternate, url: alternate.url + 'new' }] } });
  expect(view.result.current.url).toBe(alternate.url + 'new');
  auth.user.id = 92;
  view.rerender({ payload: data });
  expect(view.result.current.url).toBe(main);
});
it('falls back safely when a mirror disappears or the mode hides the URL', () => {
  const view = renderHook(({ payload }) => useSubscriptionMirror(payload, main), {
    initialProps: { payload: data },
  });
  act(() => view.result.current.select(alternate.id));
  view.rerender({ payload: { ...data, mirrors: [] } });
  expect(view.result.current.url).toBe(main);
  view.rerender({ payload: { ...data, hide_link: true } });
  expect(view.result.current.mirrors).toEqual([]);
});
it('continues sharing choices when browser storage is unavailable', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
    removeItem: () => {
      throw new Error('denied');
    },
  });
  try {
    const first = renderHook(() => useSubscriptionMirror(data, main));
    const second = renderHook(() => useSubscriptionMirror(data, main));
    act(() => first.result.current.select(alternate.id));
    expect(second.result.current.url).toBe(alternate.url);
    act(() => second.result.current.select(null));
    expect(first.result.current.url).toBe(main);
  } finally {
    vi.unstubAllGlobals();
  }
});
