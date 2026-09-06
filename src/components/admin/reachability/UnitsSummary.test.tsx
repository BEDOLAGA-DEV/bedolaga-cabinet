// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Симки одной строкой: «2 симки с Белым списком · по назначению целей · Изменить»;
 * список операторов открывается только по «Изменить». Ручной выбор помечен и сбрасывается.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { getUnits: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { UnitsSummary } from './UnitsSummary';
import { installMatchMedia, renderWithProviders, unit } from './testUtils';

const UNITS = [
  { ...unit('mts|цфо|on', 'on', 'цфо'), name: 'МТС' },
  { ...unit('tele2|цфо|on', 'on', 'цфо'), name: 'Tele2' },
  { ...unit('yota|уфо|off', 'off', 'уфо'), name: 'Yota' },
];

installMatchMedia();
beforeEach(() => vi.mocked(reachabilityApi.getUnits).mockResolvedValue(UNITS));
afterEach(cleanup);

describe('UnitsSummary', () => {
  it('авто-набор описан словами, список операторов скрыт до «Изменить»', async () => {
    renderWithProviders(
      <UnitsSummary
        kind="probe"
        selected={['mts|цфо|on', 'tele2|цфо|on']}
        auto
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(await screen.findByText('2 симки с Белым списком')).toBeTruthy();
    expect(screen.getByText('по назначению целей')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'МТС' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }));
    expect(await screen.findByRole('group', { name: 'МТС' })).toBeTruthy();
  });

  it('ручной набор: смешанный состав словами и кнопка «Как по целям»', async () => {
    const onReset = vi.fn();
    renderWithProviders(
      <UnitsSummary
        kind="probe"
        selected={['mts|цфо|on', 'yota|уфо|off']}
        auto={false}
        onChange={vi.fn()}
        onReset={onReset}
      />,
    );
    expect(await screen.findByText('2 симки: 1 с Белым списком, 1 без')).toBeTruthy();
    expect(screen.getByText('выбраны вручную')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Как по целям' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('ничего не выбрано — так и написано', async () => {
    renderWithProviders(
      <UnitsSummary kind="probe" selected={[]} auto onChange={vi.fn()} onReset={vi.fn()} />,
    );
    expect(await screen.findByText('Симки не выбраны')).toBeTruthy();
  });
});
