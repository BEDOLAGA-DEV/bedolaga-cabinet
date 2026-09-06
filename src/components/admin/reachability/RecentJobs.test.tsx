// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/** История без модалок: строка раскрывается на месте, задача из ссылки открыта сразу. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { listJobs: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { RecentJobs } from './RecentJobs';
import { installMatchMedia, renderWithProviders } from './testUtils';

const job = (id: number, kind: Job['kind']): Job =>
  ({
    id,
    kind,
    status: 'done',
    targets: [{ kind: 'host', label: `Host ${id}`, target_key: `h${id}:443` }],
    units_resolved: ['mts|цфо|on'],
    units_effective: null,
    legs: [],
    cost_kopeks: 100 * id,
    refunded_kopeks: 0,
    estimate_is_exact: true,
    error_code: null,
    error_message: null,
    result: { ok: true },
    started_at: '2026-09-05T12:00:00+00:00',
    created_at: '2026-09-05T12:00:00+00:00',
  }) as unknown as Job;

installMatchMedia();
beforeEach(() =>
  vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
    items: [job(1, 'probe'), job(2, 'vless')],
    total: 2,
    offset: 0,
    limit: 20,
  }),
);
afterEach(cleanup);

describe('RecentJobs', () => {
  it('раскрывает задачу из ссылки и сворачивает по тапу', async () => {
    renderWithProviders(<RecentJobs initialJobId={2} />);
    await screen.findByText('Host 2');
    expect(screen.getByText('◈ 200 cred ≈ 2,00 ₽')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть' }));
    expect(screen.queryByText('◈ 200 cred ≈ 2,00 ₽')).toBeNull();
  });

  it('без ссылки всё свёрнуто, «Подробности» раскрывает строку', async () => {
    renderWithProviders(<RecentJobs initialJobId={null} />);
    await screen.findByText('Host 1');
    expect(screen.queryByText('◈ 100 cred ≈ 1,00 ₽')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Host 1/ }));
    expect(screen.getByText('◈ 100 cred ≈ 1,00 ₽')).toBeTruthy();
  });

  it('раскрытая задача: ошибка словами, без служебного кода и без «Сырого ответа»', async () => {
    vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
      items: [
        {
          ...job(5, 'probe'),
          status: 'failed',
          error_code: 'no_dpi_on',
          error_message: 'Под фильтр не попала ни одна симка',
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
    });
    renderWithProviders(<RecentJobs initialJobId={5} />);
    expect(await screen.findByText('Под фильтр не попала ни одна симка')).toBeTruthy();
    expect(screen.queryByText(/no_dpi_on/)).toBeNull();
    expect(screen.queryByText('Сырой ответ')).toBeNull();
  });

  it('без счётчика в заголовке и без фильтров при коротком списке; строка словами', async () => {
    vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
      items: [job(1, 'probe')],
      total: 1,
      offset: 0,
      limit: 20,
    });
    renderWithProviders(<RecentJobs initialJobId={null} />);
    await screen.findByText('Host 1');
    expect(
      screen.getByRole('heading', { name: 'Мои проверки' }).parentElement?.textContent,
    ).not.toMatch(/\d/);
    expect(screen.queryByRole('button', { name: 'Фильтр' })).toBeNull();
    expect(screen.queryByText('Вид')).toBeNull();
    expect(screen.getAllByText(/1 симка/).length).toBeGreaterThan(0);
    expect(screen.queryByText('#1')).toBeNull();
  });

  it('раскрытие: ответ словами, «Повторить» ведёт в форму, «Свернуть» закрывает', async () => {
    vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
      items: [
        {
          ...job(3, 'probe'),
          probes: null,
          sni_hosts: [],
          targets: [
            { kind: 'host', label: 'Host 3', target_key: 'h3:443', ref: { host_uuid: 'h-3' } },
          ],
          legs: [
            { id: 1, op_key: 'mts|цфо|on', operator: 'mts', verdict: 'reachable', raw: null },
            { id: 2, op_key: 'tele2|цфо|on', operator: 'tele2', verdict: 'blocked', raw: null },
          ],
        } as unknown as Job,
      ],
      total: 1,
      offset: 0,
      limit: 20,
    });
    renderWithProviders(<RecentJobs initialJobId={3} />);
    expect(await screen.findByText('Открывается у 1 из 2 симок')).toBeTruthy();
    expect(screen.getByText(/Режется или не отвечает: tele2/)).toBeTruthy();
    const repeat = screen.getByRole('link', { name: 'Повторить' });
    expect(repeat.getAttribute('href')).toContain('repeat=3');
    expect(repeat.getAttribute('href')).toContain('kind=hosts');
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть' }));
    expect(screen.queryByText('Открывается у 1 из 2 симок')).toBeNull();
  });

  it('фильтр появляется, когда проверок больше двадцати', async () => {
    vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
      items: [job(1, 'probe')],
      total: 27,
      offset: 0,
      limit: 20,
    });
    renderWithProviders(<RecentJobs initialJobId={null} />);
    const filter = await screen.findByRole('button', { name: 'Фильтр' });
    expect(screen.queryByText('Статус')).toBeNull();
    fireEvent.click(filter);
    expect(screen.getByText('Статус')).toBeTruthy();
  });
});
