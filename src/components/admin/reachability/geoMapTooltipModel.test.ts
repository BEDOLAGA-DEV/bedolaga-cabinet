import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/reachability';
import type { CityMarker, RegionSummary } from './geoMapModel';
import {
  MAX_TOOLTIP_ROWS,
  cityTooltip,
  regionSubtitle,
  regionTooltip,
  tooltipHeight,
} from './geoMapTooltipModel';

const t = (key: string, options?: Record<string, unknown>) => {
  const words: Record<string, string> = {
    'admin.reachability.geo.map.recheck': 'Ещё раз',
    'admin.reachability.geo.map.sameExit': 'Тот же IP',
    'admin.reachability.geo.map.noCities': 'городов в проверке нет',
    'admin.reachability.geo.verdicts.ok': 'работает',
    'admin.reachability.geo.verdicts.blocked': 'блокируется',
  };
  if (key === 'admin.reachability.geo.result.cities') return `${options?.count} города`;
  return words[key] ?? String(options?.defaultValue ?? key);
};

const job = { id: 44, kind: 'geo', status: 'done', targets: [] } as unknown as Job;
const row = (
  city: string,
  verdict: string,
  provider: string,
  extra: Record<string, unknown> = {},
) => ({
  region: 'tyumen_oblast',
  region_ru: 'Тюменская область',
  city,
  city_ru: city,
  verdict,
  provider,
  latency_ms: verdict === 'ok' ? 1112 : null,
  exit_ip: '109.248.255.118',
  tunnel: {
    checks: [
      { name: 'Google', ok: verdict === 'ok', ms: 723 },
      { name: 'YouTube', ok: verdict === 'ok', ms: 724 },
    ],
  },
  ...extra,
});
const marker = (city: string, rows: ReturnType<typeof row>[]): CityMarker => ({
  key: `tyumen_oblast|${city}`,
  x: 0,
  y: 0,
  name: city,
  regionName: 'Тюменская область',
  regionCode: 'TYU',
  tone: 'ok',
  rows,
});

describe('geoMapTooltipModel', () => {
  it('город: по строке на провайдера — вердикт, выход, подпроверки; с задачей — кнопки повтора', () => {
    const model = cityTooltip(
      marker('Тюмень', [row('Тюмень', 'ok', 'Ростелеком', { sid: 's-1' })]),
      job,
      t,
    );
    expect(model.title).toBe('Тюмень');
    expect(model.subtitle).toBe('Тюменская область');
    const [line] = model.rows;
    expect(line.provider).toBe('Ростелеком');
    expect(line.latencyMs).toBe(1112);
    expect(line.exitIp).toBe('109.248.255.118');
    expect(line.checks.map((check) => `${check.name}:${check.ms}`)).toEqual([
      'Google:723',
      'YouTube:724',
    ]);
    expect(line.actions.map((action) => action.label)).toEqual(['Ещё раз', 'Тот же IP']);
    expect(line.actions[1].to).toContain('session=s-1');
    const noJob = cityTooltip(marker('Тюмень', [row('Тюмень', 'ok', 'МТС')]), null, t);
    expect(noJob.rows[0].actions).toEqual([]);
  });
  it('регион: подпись «N городов · вердикты», строки с именами городов, лишние — «ещё N»', () => {
    const summary: RegionSummary = {
      code: 'TYU',
      tone: 'down',
      cities: 2,
      counts: { ok: 1, blocked: 1 },
    };
    expect(regionSubtitle(summary, t)).toBe('2 города · 1 работает · 1 блокируется');
    const many = Array.from({ length: MAX_TOOLTIP_ROWS + 3 }, (_, i) =>
      marker(`Город ${i}`, [row(`Город ${i}`, 'ok', 'МТС')]),
    );
    const model = regionTooltip('TYU', 'Тюменская область', summary, many, null, t);
    expect(model.rows).toHaveLength(MAX_TOOLTIP_ROWS);
    expect(model.rows[0].name).toBe('Город 0');
    expect(model.moreCount).toBe(3);
    const empty = regionTooltip('TA', 'Татарстан', undefined, many, null, t);
    expect(empty.rows).toEqual([]);
    expect(empty.emptyText).toBe('городов в проверке нет');
  });
  it('высота растёт со строками, выходами, подпроверками и кнопками закреплённой подсказки', () => {
    const model = cityTooltip(
      marker('Тюмень', [row('Тюмень', 'ok', 'МТС', { sid: 's-1' })]),
      job,
      t,
    );
    const hover = tooltipHeight(model, false);
    const pinned = tooltipHeight(model, true);
    expect(hover).toBe(48 + 24 + 18 + 18 * 2);
    expect(pinned).toBe(hover + 30);
    expect(tooltipHeight({ rows: [], moreCount: 0 }, false)).toBe(48 + 24);
  });
});
