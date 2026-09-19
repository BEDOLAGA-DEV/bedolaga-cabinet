import { describe, expect, it } from 'vitest';
import { connectFooterState } from './connectFooterState';

const base = {
  status: 'active',
  subscriptionUrl: 'https://example.invalid/sub',
  deviceLimit: 5,
  connected: 2,
};

describe('connectFooterState', () => {
  it('обычная подписка со свободными слотами зовёт подключить', () => {
    expect(connectFooterState(base)).toEqual({
      kind: 'connect',
      used: 2,
      limit: 5,
      unlimited: false,
      highlight: false,
    });
  });

  it('подсвечивает подписку без единого устройства — только там действие и нужно', () => {
    const state = connectFooterState({ ...base, connected: 0 });
    expect(state).toMatchObject({ kind: 'connect', highlight: true });
  });

  it('исчерпанный лимит — это не «нельзя», а повод управлять устройствами', () => {
    expect(connectFooterState({ ...base, connected: 5 })).toEqual({
      kind: 'full',
      used: 5,
      limit: 5,
    });
  });

  it('устройств больше лимита (лимит понизили) — тоже полный', () => {
    expect(connectFooterState({ ...base, connected: 7 })).toMatchObject({ kind: 'full' });
  });

  it('нулевой лимит означает безлимит, а не запрет', () => {
    expect(connectFooterState({ ...base, deviceLimit: 0, connected: 12 })).toEqual({
      kind: 'connect',
      used: 12,
      limit: 0,
      unlimited: true,
      highlight: false,
    });
  });

  it('пока счётчик не пришёл — загрузка, а не догадка о состоянии', () => {
    expect(connectFooterState({ ...base, connected: undefined })).toEqual({ kind: 'loading' });
  });

  it.each(['expired', 'disabled'])('у подписки со статусом %s подключать нечего', (status) => {
    expect(connectFooterState({ ...base, status })).toEqual({ kind: 'hidden' });
  });

  it.each(['active', 'trial', 'limited'])('статус %s подвал показывает', (status) => {
    expect(connectFooterState({ ...base, status }).kind).toBe('connect');
  });

  it.each([null, undefined, ''])('без ссылки на подписку (%s) подвала нет', (subscriptionUrl) => {
    expect(connectFooterState({ ...base, subscriptionUrl })).toEqual({ kind: 'hidden' });
  });

  it('отсутствие ссылки важнее незагруженного счётчика', () => {
    expect(connectFooterState({ ...base, subscriptionUrl: null, connected: undefined })).toEqual({
      kind: 'hidden',
    });
  });
});
