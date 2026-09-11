// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import svgSource from './assets/russia-regions.svg?raw';
import { GeoMap, regionFills } from './GeoMap';
import { OFF_MAP_CODES, REGION_CODES } from './geoRegions';

afterEach(cleanup);

const rows = [
  { region_ru: 'Воронежская область', city_ru: 'Воронеж', verdict: 'ok' },
  { region_ru: 'Воронежская область', city_ru: 'Лиски', verdict: 'blocked' },
  { region_ru: 'Москва', city_ru: 'Москва', verdict: 'exit_bad' },
  { region_ru: 'Тмутаракань', city_ru: 'Тмутаракань', verdict: 'ok' },
];

describe('карта регионов (asset)', () => {
  it('в SVG есть контур каждого региона из таблицы, кроме заведомо отсутствующих', () => {
    const ids = new Set([...svgSource.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
    const missing = [...new Set(Object.values(REGION_CODES))].filter(
      (code) => !OFF_MAP_CODES.has(code) && !ids.has(code),
    );
    expect(missing).toEqual([]);
    expect(svgSource).toContain('viewBox="0 0 1091.992 630.119"');
  });
});

describe('GeoMap', () => {
  it('регион красится по худшему результату его городов; шум — серый; неизвестный — мимо', () => {
    expect(regionFills(rows)).toEqual({ VOR: 'down', MOW: 'na' });
  });
  it('нажатие на регион отдаёт его код, повторное — снимает; регион несёт тон и подпись', () => {
    const onSelect = vi.fn();
    const { container, rerender } = render(
      <GeoMap rows={rows} selected={null} onSelect={onSelect} />,
    );
    const vor = container.querySelector('#VOR') as SVGElement;
    expect(vor).toBeTruthy();
    expect(vor.getAttribute('data-tone')).toBe('down');
    expect(vor.querySelector('title')?.textContent).toContain('Лиски: блокируется');
    fireEvent.click(vor);
    expect(onSelect).toHaveBeenCalledWith('VOR');
    rerender(<GeoMap rows={rows} selected="VOR" onSelect={onSelect} />);
    fireEvent.click(container.querySelector('#VOR') as SVGElement);
    expect(onSelect).toHaveBeenLastCalledWith(null);
    // Регион без городов — без тона и без подписи; группа из островов красится целиком.
    expect((container.querySelector('#TA') as SVGElement).getAttribute('data-tone')).toBe('empty');
    expect(container.querySelectorAll('#ARK [data-region="ARK"]').length).toBeGreaterThan(1);
  });
  it('легенда — все десять вердиктов словами', () => {
    const { getByText } = render(<GeoMap rows={[]} selected={null} onSelect={vi.fn()} />);
    expect(getByText('работает')).toBeTruthy();
    expect(getByText(/порт не проверить/)).toBeTruthy();
  });
});
