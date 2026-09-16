import { describe, expect, it } from 'vitest';
import type { PanelSyncStatusResponse } from '@/api/adminUsers';
import { panelSyncRows } from './panelSyncRows';

const base: PanelSyncStatusResponse = {
  user_id: 1,
  telegram_id: 1,
  remnawave_id: 9,
  subscription_id: 2,
  subscription_tariff_name: 'Командный',
  last_sync: null,
  bot_subscription_status: 'active',
  bot_subscription_end_date: '2026-12-13T12:14:00Z',
  bot_traffic_limit_gb: 1500,
  bot_traffic_used_gb: 10,
  bot_device_limit: 10,
  bot_squads: ['a', 'b'],
  panel_found: true,
  panel_status: 'ACTIVE',
  panel_expire_at: '2026-12-13T12:14:00Z',
  panel_traffic_limit_gb: 1500,
  panel_traffic_used_gb: 10.2,
  panel_device_limit: 10,
  panel_squads: ['b', 'a'],
  has_differences: false,
  differences: [],
};

const differing = (status: PanelSyncStatusResponse) =>
  panelSyncRows(status)
    .filter((row) => row.differs)
    .map((row) => row.key);

/**
 * Подсветка сверки повторяет допуски бота: «active» против «ACTIVE», сдвиг МСК,
 * расход в полгигабайта и порядок сквадов отличием не считаются.
 */
describe('panelSyncRows', () => {
  it('совпадающие данные — ни одной подсветки', () => {
    expect(differing(base)).toEqual([]);
  });

  it('триал в боте и ACTIVE в панели — одно и то же', () => {
    expect(differing({ ...base, bot_subscription_status: 'trial' })).toEqual([]);
  });

  it('истекла в боте, активна в панели — статус отличается', () => {
    expect(differing({ ...base, bot_subscription_status: 'expired' })).toEqual(['status']);
  });

  it('ровно три часа (МСК) — не отличие, два часа — отличие', () => {
    expect(differing({ ...base, panel_expire_at: '2026-12-13T15:14:00Z' })).toEqual([]);
    expect(differing({ ...base, panel_expire_at: '2026-12-13T14:14:00Z' })).toEqual(['until']);
  });

  it('лимит, расход, устройства и сквады', () => {
    expect(
      differing({
        ...base,
        panel_traffic_limit_gb: 100,
        panel_traffic_used_gb: 12,
        panel_device_limit: 3,
        panel_squads: ['a'],
      }),
    ).toEqual(['trafficLimit', 'trafficUsed', 'devices', 'squads']);
  });
});

describe('открытый временный доступ', () => {
  /** Панель с оверлеем грейса: живая, своя дата, урезанный лимит, свой сквад. */
  const withOverlay = (extra: Partial<PanelSyncStatusResponse> = {}): PanelSyncStatusResponse => ({
    ...base,
    bot_subscription_status: 'expired',
    bot_subscription_end_date: '2026-09-15T00:00:00Z',
    bot_traffic_limit_gb: 300,
    bot_squads: ['own'],
    panel_status: 'ACTIVE',
    panel_expire_at: '2026-09-16T00:00:00Z',
    panel_traffic_limit_gb: 74,
    panel_squads: ['grace'],
    ...extra,
  });

  it('оверлей грейса не считается расхождением', () => {
    const rows = panelSyncRows(
      withOverlay({ grace_open: true, grace_until: '2026-09-16T00:00:00Z' }),
    );
    expect(rows.filter((row) => row.differs).map((row) => row.key)).toEqual([]);
    expect(
      rows
        .filter((row) => row.byGrace)
        .map((row) => row.key)
        .sort(),
    ).toEqual(['squads', 'status', 'trafficLimit', 'until']);
  });

  it('без грейса те же данные остаются расхождением', () => {
    const rows = panelSyncRows(withOverlay());
    expect(
      rows
        .filter((row) => row.differs)
        .map((row) => row.key)
        .sort(),
    ).toEqual(['squads', 'status', 'trafficLimit', 'until']);
    expect(rows.every((row) => !row.byGrace)).toBe(true);
  });

  it('расход трафика сверяется и в грейсе', () => {
    const rows = panelSyncRows(
      withOverlay({ grace_open: true, bot_traffic_used_gb: 5, panel_traffic_used_gb: 71 }),
    );
    const used = rows.find((row) => row.key === 'trafficUsed');
    expect(used?.differs).toBe(true);
    expect(used?.byGrace).toBe(false);
  });

  it('совпадающие строки грейс не красит', () => {
    const rows = panelSyncRows({ ...base, grace_open: true });
    expect(rows.every((row) => !row.differs && !row.byGrace)).toBe(true);
  });
});
