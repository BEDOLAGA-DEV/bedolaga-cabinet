// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/**
 * Таблица результата как в оригинале: строки — симки операторов с округом, столбцы — пробы,
 * в ячейке точка и значение, справа наш вердикт; список SNI-имён под таблицей. Сырого ответа нет.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: { getUnits: vi.fn().mockResolvedValue([]) },
}));

import { ProbeResult } from './ProbeResult';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

const job = {
  id: 1,
  kind: 'probe',
  targets: [{ kind: 'host', label: 'Russia | LTE | БС', target_key: 'bs.example:9443' }],
  probes: { icmp: true, tcp: true, sni: true },
  sni_hosts: ['ads.x5.ru', 'vk.com'],
  legs: [
    {
      id: 1,
      target_key: 'bs.example:9443',
      op_key: 'mts|цфо|on',
      operator: 'mts',
      region: 'ЦФО',
      dpi: 'on',
      verdict: 'reachable',
      matches_expectation: true,
      raw: {
        ok: true,
        icmp: { ok: true, rtt_avg_ms: 49.6 },
        tcp: { ok: false, received: 1, total: 1 },
        tcp_is_tls: true,
        sni: [{ ok: true }, { ok: false }],
        http: null,
      },
    },
    {
      id: 2,
      target_key: 'bs.example:9443',
      op_key: 'yota|уфо|off',
      operator: 'yota',
      region: 'УФО',
      dpi: 'off',
      verdict: 'down',
      matches_expectation: null,
      raw: { ok: false, error: 'modem lost' },
    },
  ],
} as unknown as Job;

describe('ProbeResult', () => {
  it('столбцы по пробам, строки по симкам, значения в ячейках, список SNI и сырой ответ по тапу', () => {
    renderWithProviders(<ProbeResult job={job} />);
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Оператор',
      'Вердикт',
      'ICMP',
      'TCP',
      '2×SNI',
    ]);
    expect(screen.getByText('50 ms')).toBeTruthy();
    expect(screen.getByText('(tls)')).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.getAllByText('без БС').length).toBeGreaterThan(0);
    expect(screen.getByText('SNI: 1 ads.x5.ru · 2 vk.com')).toBeTruthy();
    expect(screen.queryByText(/rtt_avg_ms/)).toBeNull();
    // Заголовков в капсе нет, шрифт не мельче 12 px.
    for (const th of screen.getAllByRole('columnheader')) {
      expect(th.className).not.toMatch(/uppercase/);
      expect(th.className).not.toMatch(/text-\[(8|9|10|11)px\]/);
    }
  });

  it('на телефоне — список «оператор → вердикт», пробы раскрываются по тапу', () => {
    renderWithProviders(<ProbeResult job={job} />);
    const list = screen.getByRole('list', { name: 'Результат по симкам' });
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('mts');
    expect(rows[0].textContent).toContain('доступен');
    expect(within(list).queryByText('50 ms')).toBeNull();
    fireEvent.click(rows[0]);
    expect(within(list).getByText('50 ms')).toBeTruthy();
    expect(within(list).getByText('ICMP')).toBeTruthy();
  });
});
