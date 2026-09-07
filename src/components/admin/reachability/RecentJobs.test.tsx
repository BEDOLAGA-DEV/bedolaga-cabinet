// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/**
 * История без модалок: строка раскрывается на месте, задача из ссылки открыта сразу,
 * пачка серверов — одной строкой с итогом словами, фильтр по серверу из его карточки.
 */

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
    batch_id: null,
    sni_hosts: [],
    probes: null,
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
      screen.getByRole('heading', { name: 'История проверок' }).parentElement?.textContent,
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

  it('пачка серверов — одна строка «N серверов · работают X из N», раскрытие и «Повторить» на всех', async () => {
    const host = (key: string, uuid: string) => ({
      kind: 'host',
      label: key,
      target_key: `${key}:443`,
      ref: { host_uuid: uuid },
    });
    const leg = (key: string, verdict: string) => ({
      id: 1,
      target_key: `${key}:443`,
      op_key: 'mts|цфо|on',
      operator: 'mts',
      verdict,
      raw: null,
    });
    vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
      items: [
        {
          ...job(11, 'probe'),
          batch_id: 7,
          targets: [host('Alpha', 'h-a'), host('Beta', 'h-b')],
          legs: [leg('Alpha', 'reachable'), leg('Beta', 'blocked')],
        } as unknown as Job,
        {
          ...job(12, 'probe'),
          batch_id: 7,
          targets: [host('Gamma', 'h-c')],
          legs: [leg('Gamma', 'reachable')],
        } as unknown as Job,
        job(2, 'vless'),
      ],
      total: 3,
      offset: 0,
      limit: 20,
    });
    renderWithProviders(<RecentJobs initialJobId={null} />);
    const row = await screen.findByRole('button', { name: /3 сервера/ });
    expect(row.textContent).toContain('работают 2 из 3');
    expect(row.textContent).toContain('◈ 2 300 cred');
    expect(screen.queryByText('Host 11')).toBeNull();
    fireEvent.click(row);
    expect(screen.getByText('Alpha:')).toBeTruthy();
    expect(screen.getByText('Gamma:')).toBeTruthy();
    const repeat = screen.getByRole('link', { name: 'Повторить' });
    const href = repeat.getAttribute('href') ?? '';
    expect(href).toContain('kind=hosts');
    expect(href).toContain('repeat=11');
    for (const uuid of ['h-a', 'h-b', 'h-c']) expect(href).toContain(`target=host%3A${uuid}`);
  });

  it('фильтр по серверу из карточки: чип с именем, крестик снимает', async () => {
    const onClearTarget = vi.fn();
    renderWithProviders(
      <RecentJobs initialJobId={null} targetKey="h1:443" onClearTarget={onClearTarget} />,
    );
    await screen.findByText('Host 1');
    expect(reachabilityApi.listJobs).toHaveBeenLastCalledWith(
      expect.objectContaining({ target_key: 'h1:443' }),
    );
    expect(screen.getByText('Сервер: Host 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Все серверы' }));
    expect(onClearTarget).toHaveBeenCalled();
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
