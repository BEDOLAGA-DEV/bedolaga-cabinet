// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { GeoMap } from './GeoMap';

afterEach(cleanup);

const rows = [
  {
    region: 'voronezh_oblast',
    region_ru: 'Воронежская область',
    city: 'voronezh',
    city_ru: 'Воронеж',
    verdict: 'ok',
    provider: 'Ростелеком',
    latency_ms: 120,
  },
  {
    region: 'voronezh_oblast',
    region_ru: 'Воронежская область',
    city: 'liski',
    city_ru: 'Лиски',
    verdict: 'blocked',
    provider: 'МТС',
    latency_ms: null,
  },
  {
    region: 'moscow',
    region_ru: 'Москва',
    city: 'moscow',
    city_ru: 'Москва',
    verdict: 'exit_bad',
    provider: null,
    latency_ms: null,
  },
];

async function renderMap(highlightVerdict: string | null = null) {
  const view = render(<GeoMap rows={rows} highlightVerdict={highlightVerdict} />);
  await waitFor(() => expect(view.container.querySelector('svg')).toBeTruthy());
  return view;
}

describe('GeoMap', () => {
  it('пока контуры грузятся — заглушка с пропорциями карты, потом Россия с границами и точки городов', async () => {
    const { container } = render(<GeoMap rows={rows} />);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    await waitFor(() => expect(container.querySelector('svg')).toBeTruthy());
    expect(container.querySelectorAll('[data-region]')).toHaveLength(83);
    expect(container.querySelectorAll('[data-city]')).toHaveLength(3);
    expect(container.querySelector('[data-region="VOR"]')?.getAttribute('data-tone')).toBe('down');
    expect(container.querySelector('[data-region="MOW"]')?.getAttribute('data-tone')).toBe('na');
    expect(container.querySelector('[data-region="TA"]')?.getAttribute('data-tone')).toBe('empty');
    expect(
      container.querySelector('[data-city="voronezh_oblast|liski"]')?.getAttribute('data-tone'),
    ).toBe('down');
  });
  it('наведение на город — подсказка словами: вердикт, провайдер, задержка; на регион — счёт городов', async () => {
    const { container } = await renderMap();
    fireEvent.pointerMove(
      container.querySelector('[data-city="voronezh_oblast|voronezh"]') as Element,
    );
    expect(screen.getByRole('tooltip').textContent).toContain('Воронеж');
    expect(screen.getByRole('tooltip').textContent).toContain('работает · Ростелеком · 120 мс');
    fireEvent.pointerMove(container.querySelector('[data-region="VOR"]') as Element);
    const tip = screen.getByRole('tooltip').textContent ?? '';
    expect(tip).toContain('Воронежская область');
    expect(tip).toContain('2 города');
    expect(tip).toContain('блокируется (подтверждено) · 1');
    fireEvent.pointerMove(container.querySelector('[data-region="TA"]') as Element);
    expect(screen.getByRole('tooltip').textContent).toContain('городов в проверке нет');
    fireEvent.pointerLeave(container.firstElementChild as Element);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('касание закрепляет подсказку с крестиком; клик мимо снимает; список городов карта не трогает', async () => {
    const { container } = await renderMap();
    const liski = container.querySelector('[data-city="voronezh_oblast|liski"]') as Element;
    fireEvent.click(liski);
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeTruthy();
    fireEvent.pointerMove(container.querySelector('[data-region="TA"]') as Element);
    expect(screen.getByRole('tooltip').textContent).toContain('Лиски');
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(liski);
    fireEvent.click(container.querySelector('svg') as Element);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('активный чип приглушает точки других вердиктов, регионы не меняются', async () => {
    const { container } = await renderMap('blocked');
    expect(
      container.querySelector('[data-city="voronezh_oblast|liski"]')?.getAttribute('data-dim'),
    ).toBe('false');
    expect(
      container.querySelector('[data-city="voronezh_oblast|voronezh"]')?.getAttribute('data-dim'),
    ).toBe('true');
    expect(container.querySelector('[data-region="VOR"]')?.getAttribute('data-tone')).toBe('down');
  });
});
