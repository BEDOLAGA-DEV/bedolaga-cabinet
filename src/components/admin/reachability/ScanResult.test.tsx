// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/** Результат скана словами: живых адресов из всех, операторы по именам, «кто что увидел» — пинг/порт/SNI. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { getUnits: vi.fn() } }));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import { reachabilityApi } from '@/api/reachability';
import { ScanResult } from './ScanResult';
import { installMatchMedia, renderWithProviders, unit } from './testUtils';

installMatchMedia();
beforeEach(() =>
  vi
    .mocked(reachabilityApi.getUnits)
    .mockResolvedValue([{ ...unit('mts|kgd|on', 'on', 'kgd'), name: 'МТС', region: 'KGD' }]),
);
afterEach(cleanup);

const job = {
  result: {
    status: {
      result: {
        up_n: 1,
        total: 256,
        operators: ['mts|kgd|on'],
        results: [
          {
            ip: '192.0.2.7',
            by_operator: { 'mts|kgd|on': { icmp: true, tcp: false, sni: { 'ads.x5.ru': true } } },
          },
        ],
      },
    },
  },
} as unknown as Job;

describe('ScanResult', () => {
  it('говорит словами и не показывает служебных ключей', async () => {
    renderWithProviders(<ScanResult job={job} />);
    expect(screen.getByText('1 живой адрес')).toBeTruthy();
    expect(screen.getByText('из 256')).toBeTruthy();
    expect(await screen.findByText('МТС')).toBeTruthy();
    expect(screen.getByText('КГД')).toBeTruthy();
    expect(screen.queryByText(/mts\|kgd\|on/)).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'показать, кто что увидел' }));
    expect(await screen.findByText('МТС КГД: пинг · SNI ads.x5.ru')).toBeTruthy();
  });
});
