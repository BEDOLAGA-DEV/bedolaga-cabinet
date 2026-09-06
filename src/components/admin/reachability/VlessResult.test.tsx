// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/**
 * Результат VLESS-теста в том же стиле, что таблица проб: строки — симки операторов,
 * столбцы — туннель · цели · задержка · Xray · причина, справа вердикт; серверы — группами;
 * причина словами, диагноз — по тапу на строку; сырого ответа нет.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: {
    getUnits: vi.fn().mockResolvedValue([]),
    getStatus: vi.fn().mockResolvedValue({ cores: { stable: '26.3.27' } }),
  },
}));

import { VlessResult } from './VlessResult';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

const job = {
  id: 2,
  kind: 'vless',
  targets: [
    { kind: 'host', label: '🇩🇪 Germany', target_key: 'eu.example:443' },
    { kind: 'host', label: '🇷🇺 Russia | LTE | БС', target_key: 'bs.example:9443' },
  ],
  probes: null,
  sni_hosts: [],
  legs: [
    {
      id: 1,
      target_key: 'eu.example:443',
      op_key: 'tele2|цфо|on',
      operator: 'tele2',
      region: 'ЦФО',
      dpi: 'on',
      verdict: 'blocked',
      matches_expectation: null,
      raw: {
        server_name: '🇩🇪 Germany',
        tunnel_up: true,
        targets: [{ ok: true }, { ok: false }, { ok: true }],
        tcp_latency_ms: 82,
        used_core: 'stable',
        fail_reason: 'zombie_tcp',
        diagnosis: 'Туннель до сервера есть, но целевые сайты режутся',
      },
    },
    {
      id: 2,
      target_key: 'bs.example:9443',
      op_key: 'mts|пфо|off',
      operator: 'mts',
      region: 'ПФО',
      dpi: 'off',
      verdict: 'down',
      matches_expectation: false,
      raw: {
        server_name: '🇷🇺 Russia | LTE | БС',
        operator_name: 'МТС',
        tunnel_up: false,
        targets: [{ ok: false }, { ok: false }],
        tcp_latency_ms: 3008,
        used_core: 'stable',
        fail_reason: 'tcp_timeout',
        diagnosis: 'Сервер режется на этом операторе',
      },
    },
  ],
} as unknown as Job;

describe('VlessResult', () => {
  it('таблица как у проб: столбцы, группы по серверам, значения в ячейках', async () => {
    renderWithProviders(<VlessResult job={job} />);
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Оператор',
      'Туннель',
      'Цели',
      'Задержка',
      'Xray',
      'Причина',
      'Вердикт',
    ]);
    expect(screen.getByText('🇩🇪 Germany')).toBeTruthy();
    expect(screen.getByText('eu.example:443')).toBeTruthy();
    expect(screen.getByText('🇷🇺 Russia | LTE | БС')).toBeTruthy();
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(screen.getByText('0/2')).toBeTruthy();
    expect(screen.getByText('82 ms')).toBeTruthy();
    expect(screen.getByText('рвётся после TLS')).toBeTruthy();
    expect(screen.getByText('нет ответа')).toBeTruthy();
    expect(screen.queryByText('zombie_tcp')).toBeNull();
    expect(screen.getByText('без БС')).toBeTruthy();
    expect(screen.getByText('МТС')).toBeTruthy();
    expect(screen.getByText('режется')).toBeTruthy();
    expect(screen.getByText('недоступен')).toBeTruthy();
    expect(await screen.findAllByText('26.3.27')).toHaveLength(2);
  });

  it('диагноз словами показывается по тапу на строку, сырого ответа нет', () => {
    renderWithProviders(<VlessResult job={job} />);
    expect(screen.queryByText('Сервер режется на этом операторе')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /МТС/ }));
    expect(screen.getByText('Сервер режется на этом операторе')).toBeTruthy();
    expect(screen.queryByText(/fail_reason/)).toBeNull();
    expect(screen.queryByText('Туннель до сервера есть, но целевые сайты режутся')).toBeNull();
  });

  it('без легов — «Результат пуст»', () => {
    renderWithProviders(<VlessResult job={{ ...job, legs: [] }} />);
    expect(screen.getByText('Результат пуст')).toBeTruthy();
  });
});
