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
      { pointerType: 'mouse' },
    );
    expect(screen.getByRole('tooltip').textContent).toContain('Воронеж');
    expect(screen.getByRole('tooltip').textContent).toContain('работает · Ростелеком · 120 мс');
    fireEvent.pointerMove(container.querySelector('[data-region="VOR"]') as Element, {
      pointerType: 'mouse',
    });
    const tip = screen.getByRole('tooltip').textContent ?? '';
    expect(tip).toContain('Воронежская область');
    expect(tip).toContain('2 города · 1 работает · 1 блокируется (подтверждено)');
    expect(tip).toContain('Лиски');
    expect(tip).toContain('Воронеж работает · Ростелеком · 120 мс');
    fireEvent.pointerMove(container.querySelector('[data-region="TA"]') as Element, {
      pointerType: 'mouse',
    });
    expect(screen.getByRole('tooltip').textContent).toContain('городов в проверке нет');
    fireEvent.pointerLeave(container.firstElementChild as Element);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('касание закрепляет подсказку с крестиком; клик мимо снимает; список городов карта не трогает', async () => {
    const { container } = await renderMap();
    const liski = container.querySelector('[data-city="voronezh_oblast|liski"]') as Element;
    fireEvent.click(liski);
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeTruthy();
    fireEvent.pointerMove(container.querySelector('[data-region="TA"]') as Element, {
      pointerType: 'mouse',
    });
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

describe('GeoMap на телефоне: зум и сдвиг', () => {
  it('кнопки «+», «−» и «вся карта» меняют окно просмотра; на полном виде «−» недоступна', async () => {
    const { container } = await renderMap();
    const svg = container.querySelector('svg') as SVGSVGElement;
    const host = container.firstElementChild as HTMLElement;
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 545');
    expect((screen.getByRole('button', { name: 'Отдалить' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.queryByRole('button', { name: 'Вся карта' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Приблизить' }));
    expect(host.getAttribute('data-zoom')).toBe('1.80');
    expect(host.style.touchAction).toBe('none');
    const [, , w] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
    expect(w).toBeCloseTo(1000 / 1.8, 0);
    fireEvent.click(screen.getByRole('button', { name: 'Вся карта' }));
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 545');
    expect(host.style.touchAction).toBe('pan-y');
  });
  it('приближено — палец тянет карту, окно сдвигается, отпускание не считается касанием', async () => {
    const { container } = await renderMap();
    const host = container.firstElementChild as HTMLElement;
    const svg = container.querySelector('svg') as SVGSVGElement;
    fireEvent.click(screen.getByRole('button', { name: 'Приблизить' }));
    const before = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerMove(host, { pointerId: 1, pointerType: 'touch', clientX: 160, clientY: 120 });
    fireEvent.pointerUp(host, { pointerId: 1, pointerType: 'touch', clientX: 160, clientY: 120 });
    const after = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
    expect(after[0]).toBeLessThan(before[0]);
    expect(after[1]).toBeLessThan(before[1]);
    expect(after[2]).toBeCloseTo(before[2]);
    fireEvent.click(host);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('щипок двумя пальцами приближает вокруг середины между ними', async () => {
    const { container } = await renderMap();
    const host = container.firstElementChild as HTMLElement;
    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
    fireEvent.pointerDown(host, { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100 });
    fireEvent.pointerMove(host, { pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 100 });
    expect(Number(host.getAttribute('data-zoom'))).toBeCloseTo(2, 1);
    fireEvent.pointerUp(host, { pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 100 });
    fireEvent.pointerUp(host, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
  });
  it('двойное касание приближает; на компе мышью карта не двигается', async () => {
    const { container } = await renderMap();
    const host = container.firstElementChild as HTMLElement;
    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'mouse', clientX: 100, clientY: 100 });
    fireEvent.pointerMove(host, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 150 });
    fireEvent.pointerUp(host, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 150 });
    expect(host.getAttribute('data-zoom')).toBe('1.00');
    for (const tap of [1, 2]) {
      fireEvent.pointerDown(host, {
        pointerId: tap,
        pointerType: 'touch',
        clientX: 50,
        clientY: 50,
      });
      fireEvent.pointerUp(host, { pointerId: tap, pointerType: 'touch', clientX: 50, clientY: 50 });
    }
    expect(host.getAttribute('data-zoom')).toBe('1.80');
  });
});
