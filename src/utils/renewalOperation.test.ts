// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { renewalOperationId } from './renewalOperation';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

it('reuses a persisted operation after a module reload', async () => {
  const id = renewalOperationId(7, 30, '2026-12-01T00:00:00Z');
  vi.resetModules();
  const reloaded = await import('./renewalOperation');
  expect(reloaded.renewalOperationId(7, 30, '2026-12-01T00:00:00Z')).toBe(id);
});

it('separates subscriptions, periods and newly extended snapshots', () => {
  const ids = [
    renewalOperationId(8, 30, '2026-12-01T00:00:00Z'),
    renewalOperationId(9, 30, '2026-12-01T00:00:00Z'),
    renewalOperationId(8, 60, '2026-12-01T00:00:00Z'),
    renewalOperationId(8, 30, '2027-01-01T00:00:00Z'),
  ];
  expect(new Set(ids).size).toBe(4);
});

it('keeps retries stable when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  expect(renewalOperationId(10, 30, '2026-12-01T00:00:00Z')).toBe(
    renewalOperationId(10, 30, '2026-12-01T00:00:00Z'),
  );
});
