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
