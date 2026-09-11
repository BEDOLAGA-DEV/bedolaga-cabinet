// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import type { Job } from '@/api/reachability';
import { GeoRows } from './GeoRows';
import type { GeoRow } from './geoRowsView';

afterEach(cleanup);

const ROWS: GeoRow[] = [
  {
    region: 'moscow',
    region_ru: 'Москва',
    district: 'ЦФО',
    city: 'moscow',
    city_ru: 'Москва',
    provider: 'mts',
    verdict: 'ok',
    is_result: true,
    latency_ms: 90,
    targets: [{ key: 'a.example:443', ok: true, ms: 90, kind: 'tls', err: null }],
    tunnel: null,
    heavy: null,
    mb_bill: 0.1,
    err: null,
    flaky: false,
    retries: null,
  },
  {
    region: 'omsk_oblast',
    region_ru: 'Омская область',
    district: 'СФО',
    city: 'omsk',
    city_ru: 'Омск',
    provider: null,
    verdict: 'no_ru_node',
    is_result: false,
    latency_ms: null,
    targets: [],
    tunnel: null,
    heavy: null,
    mb_bill: null,
    err: 'run-timeout',
    flaky: false,
    retries: null,
  },
  {
    region: 'spb',
    region_ru: 'Санкт-Петербург',
    district: 'СЗФО',
    city: 'spb',
    city_ru: 'Санкт-Петербург',
    provider: 'beeline',
    verdict: 'throttled',
    is_result: true,
    latency_ms: 300,
    targets: [],
    tunnel: {
      used_core: 'stable',
      checks: [
        { name: 'IP-проверка', ok: true, ms: 300 },
        { name: 'Google', ok: false, ms: null },
      ],
    },
    heavy: { kbps: 1200, froze: true, hv_measured: true, hv_small: false },
    mb_bill: 0.3,
    err: null,
    flaky: false,
    retries: null,
  },
];

describe('GeoRows', () => {
  it('строка города: регион, провайдер, вердикт словами, задержка, цели; причина у непроверенного', () => {
    render(<GeoRows rows={ROWS} />);
    // Таблица (md+) и карточки (телефон) рендерятся обе, прячет одну из них CSS — отсюда getAllByText.
    expect(screen.getAllByText('Москва').length).toBeGreaterThan(0);
    expect(screen.getAllByText('работает').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90 мс').length).toBeGreaterThan(0);
    expect(screen.getAllByText('нет RU-ноды').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/run-timeout/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/a\.example:443/).length).toBeGreaterThan(0);
  });
  it('туннель: подпроверки вместо целей; тяжёлая проба — скорость и заморозка', () => {
    render(<GeoRows rows={ROWS} />);
    expect(screen.getAllByText(/IP-проверка/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Google/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1200/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/заморозка/).length).toBeGreaterThan(0);
  });
  it('пусто под фильтром — подпись', () => {
    render(<GeoRows rows={[]} />);
    expect(screen.getByText('Ни одного города под фильтром')).toBeTruthy();
  });
});

describe('GeoRows · повтор из отчёта', () => {
  const job = {
    id: 44,
    kind: 'geo',
    status: 'done',
    targets: [],
    finished_at: new Date().toISOString(),
  } as unknown as Job;
  const recheck = () => ({ busy: new Set<string>(), start: vi.fn() });
  it('кнопки «тот же IP» и «сменить IP» только у проваленных строк; клик запускает повтор', () => {
    const control = recheck();
    render(<GeoRows rows={ROWS} job={job} recheck={control} />);
    // ROWS: Москва ok, Омск no_ru_node, Петербург throttled — кнопки у двух последних.
    expect(screen.getAllByRole('button', { name: /Сменить IP/ })).toHaveLength(4);
    fireEvent.click(screen.getAllByRole('button', { name: /Тот же IP/ })[0]);
    expect(control.start).toHaveBeenCalledWith(expect.objectContaining({ city: 'omsk' }), true);
  });
  it('пока идёт — «⏳», после повтора — «⤴ перепроверено» и пометка «новый выход» у свежей строки', () => {
    const control = { busy: new Set(['omsk_oblast|omsk|']), start: vi.fn() };
    render(
      <GeoRows
        rows={[
          ROWS[1],
          { ...ROWS[2], rechecked: true },
          { ...ROWS[2], exit_ip: '9.9.9.9', verdict: 'ok', new_exit: true },
        ]}
        job={job}
        recheck={control}
      />,
    );
    expect(screen.getAllByText('Идёт проверка…').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Перепроверено').length).toBeGreaterThan(0);
    expect(screen.getAllByText('новый выход').length).toBeGreaterThan(0);
  });
  it('идущая задача и задача без перепроверки — без колонки повтора', () => {
    render(<GeoRows rows={ROWS} job={{ ...job, status: 'running' }} recheck={recheck()} />);
    expect(screen.queryByRole('button', { name: /Сменить IP/ })).toBeNull();
    cleanup();
    render(<GeoRows rows={ROWS} job={job} />);
    expect(screen.queryByRole('button', { name: /Сменить IP/ })).toBeNull();
  });
});
