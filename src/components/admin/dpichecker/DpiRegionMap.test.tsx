// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DpiRegionMap } from './DpiRegionMap';
import type { RegionState } from './regionMap';

/**
 * Карта результата как на dpichecker.st: регионы цветом итога, наведение мышью — подсказка с
 * регионом, итогом словами и операторами «ок из»; касание открывает, второе касание — закрывает.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

afterEach(cleanup);

const STATES = new Map<string, RegionState>([
  [
    'ARK',
    {
      name: 'Архангельская обл.',
      status: 'yellow',
      pops: [
        { label: 'Ростелеком', ok: 2, bad: 0, dead: 0 },
        { label: null, ok: 1, bad: 1, dead: 0 },
      ],
    },
  ],
  ['CR', { name: 'Крым', status: 'gray', pops: [{ label: null, ok: 0, bad: 0, dead: 1 }] }],
]);

async function renderMap() {
  const view = render(<DpiRegionMap states={STATES} />);
  await waitFor(() => expect(view.container.querySelector('[data-region="ARK"]')).toBeTruthy());
  return view;
}

it('регион красится итогом, непроверенный — пустой', async () => {
  const { container } = await renderMap();
  expect(container.querySelectorAll('[data-region]')).toHaveLength(87);
  expect(container.querySelector('[data-region="ARK"]')?.getAttribute('data-status')).toBe(
    'yellow',
  );
  expect(container.querySelector('[data-region="CR"]')?.getAttribute('data-status')).toBe('gray');
  expect(container.querySelector('[data-region="MOW"]')?.getAttribute('data-status')).toBe('none');
});

it('наведение мышью — регион, итог словами и операторы «ок из»', async () => {
  const { container } = await renderMap();
  fireEvent.pointerMove(container.querySelector('[data-region="ARK"]') as Element, {
    pointerType: 'mouse',
  });
  const tip = await screen.findByRole('tooltip');
  expect(within(tip).getByText('Архангельская обл.')).toBeTruthy();
  expect(within(tip).getByText('частично')).toBeTruthy();
  expect(within(tip).getByText('Ростелеком')).toBeTruthy();
  expect(within(tip).getByText('2/2 ок')).toBeTruthy();
  expect(within(tip).getByText('Любой')).toBeTruthy();
  expect(within(tip).getByText('1/2 ок')).toBeTruthy();
  fireEvent.pointerLeave(tip.parentElement as Element, { pointerType: 'mouse' });
  expect(screen.queryByRole('tooltip')).toBeNull();
});

it('прокси точки не поднялся — так и сказано; непроверенный регион — «не проверялся»', async () => {
  const { container } = await renderMap();
  fireEvent.pointerMove(container.querySelector('[data-region="CR"]') as Element, {
    pointerType: 'mouse',
  });
  expect(within(await screen.findByRole('tooltip')).getByText('прокси недоступен')).toBeTruthy();
  fireEvent.pointerMove(container.querySelector('[data-region="MOW"]') as Element, {
    pointerType: 'mouse',
  });
  expect(within(await screen.findByRole('tooltip')).getByText('не проверялся')).toBeTruthy();
});

it('касание открывает подсказку, повторное касание того же региона — закрывает', async () => {
  const { container } = await renderMap();
  const region = container.querySelector('[data-region="ARK"]') as Element;
  fireEvent.pointerDown(region, { pointerType: 'touch' });
  fireEvent.click(region);
  expect(await screen.findByRole('tooltip')).toBeTruthy();
  fireEvent.pointerDown(region, { pointerType: 'touch' });
  fireEvent.click(region);
  expect(screen.queryByRole('tooltip')).toBeNull();
});

it('легенда — образцы той же заливки, что у регионов (в светлой теме текстовые цвета темнее заливки)', async () => {
  const { container } = await renderMap();
  const swatch = (status: string) =>
    container.querySelector(`[data-legend="${status}"]`)?.className ?? '';
  expect(swatch('green')).toContain('bg-success-500/60');
  expect(swatch('yellow')).toContain('bg-warning-500/60');
  expect(swatch('red')).toContain('bg-error-500/60');
  // «Не проверялся» — цвет земли на карте, а не отдельный серый.
  expect(swatch('none')).toContain('bg-dark-700/70');
});
