import { describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';
import type { CityMarker, RegionSummary } from './geoMapModel';
import {
  MAX_TOOLTIP_ROWS,
  type RecheckContext,
  cityTooltip,
  regionSubtitle,
  regionTooltip,
  tooltipHeight,
} from './geoMapTooltipModel';

const t = (key: string, options?: Record<string, unknown>) => {
  const words: Record<string, string> = {
    'admin.reachability.geo.map.noCities': 'городов в проверке нет',
    'admin.reachability.geo.verdicts.ok': 'работает',
    'admin.reachability.geo.verdicts.blocked': 'блокируется',
  };
  if (key === 'admin.reachability.geo.result.cities') return `${options?.count} города`;
  return words[key] ?? String(options?.defaultValue ?? key);
};

const job = {
  id: 44,
  kind: 'geo',
  status: 'done',
  targets: [],
  finished_at: new Date().toISOString(),
} as unknown as Job;
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
const context = (busy: string[] = []): RecheckContext => ({
  job,
  recheck: { busy: new Set(busy), start: vi.fn() },
});

describe('geoMapTooltipModel', () => {
  it('город: по строке на провайдера — вердикт, выход, подпроверки', () => {
    const model = cityTooltip(marker('Тюмень', [row('Тюмень', 'ok', 'Ростелеком')]), null);
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
    expect(line.recheck).toBeNull();
  });
  it('повтор как у оригинала: у зелёной строки кнопок нет, у проваленной — «тот же IP» и «сменить IP»', () => {
    const ctx = context();
    const ok = cityTooltip(marker('Тюмень', [row('Тюмень', 'ok', 'МТС')]), ctx);
    expect(ok.rows[0].recheck).toBeNull();
    const failed = row('Тюмень', 'blocked', 'МТС', { sid: 's-1', sid_hold_s: 200 });
    const bad = cityTooltip(marker('Тюмень', [failed]), ctx);
    const recheck = bad.rows[0].recheck;
    expect(recheck?.state).toBe('buttons');
    // Кнопки рисует RecheckButtons — модели хватает задачи (удержание выхода) и самой строки.
    expect(recheck?.job).toBe(job);
    expect(recheck?.row).toBe(failed);
    recheck?.onStart(true);
    expect(ctx.recheck.start).toHaveBeenCalledWith(failed, true);
    recheck?.onStart(false);
    expect(ctx.recheck.start).toHaveBeenLastCalledWith(failed, false);
    const busy = cityTooltip(marker('Тюмень', [failed]), context(['tyumen_oblast|Тюмень|']));
    expect(busy.rows[0].recheck?.state).toBe('busy');
    const spent = cityTooltip(
      marker('Тюмень', [row('Тюмень', 'blocked', 'МТС', { rechecked: true })]),
      ctx,
    );
    expect(spent.rows[0].recheck?.state).toBe('rechecked');
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
    const model = cityTooltip(marker('Тюмень', [row('Тюмень', 'blocked', 'МТС')]), context());
    const hover = tooltipHeight(model, false);
    const pinned = tooltipHeight(model, true);
    expect(hover).toBe(48 + 24 + 18 + 18 * 2);
    expect(pinned).toBe(hover + 30);
    expect(tooltipHeight({ rows: [], moreCount: 0 }, false)).toBe(48 + 24);
  });
});
