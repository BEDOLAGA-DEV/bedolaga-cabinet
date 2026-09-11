// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('./useGeoCatalog', () => ({
  useGeoCatalog: () => ({
    data: {
      networks: ['res', 'mob'],
      districts: [
        { code: 'cfo', name: 'ЦФО' },
        { code: 'pfo', name: 'ПФО' },
      ],
      regions: [{ token: 'moscow', name: 'Москва', district: 'ЦФО' }],
      isps: [{ token: 'mts', name: 'МТС', cities: 43 }],
      cities: [],
      cities_total: 0,
      cities_truncated: false,
    },
    isLoading: false,
  }),
  useGeoCitySearch: () => ({
    data: {
      networks: [],
      districts: [],
      regions: [],
      isps: [],
      cities: [
        {
          region: 'voronezh_oblast',
          region_ru: 'Воронежская область',
          district: 'ЦФО',
          city: 'voronezh',
          city_ru: 'Воронеж',
          isps: ['rostelecom', 'mts'],
        },
      ],
      cities_total: 1,
      cities_truncated: false,
    },
    isFetching: false,
  }),
}));

import { GeoScope } from './GeoScope';
import { DEFAULT_GEO_FORM } from './geoForm';

afterEach(cleanup);

describe('GeoScope', () => {
  it('сеть, охват и потолок — чипами; округ и провайдер из справочника', () => {
    const onChange = vi.fn();
    render(<GeoScope value={DEFAULT_GEO_FORM} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Мобильный' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GEO_FORM, network: 'mob' });
    fireEvent.click(screen.getByRole('button', { name: 'Округ' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GEO_FORM, scopeKind: 'district' });
    fireEvent.click(screen.getByRole('button', { name: '30' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GEO_FORM, cityLimit: 30 });
    fireEvent.change(screen.getByLabelText('Провайдер'), { target: { value: 'mts' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GEO_FORM, isp: 'mts' });
  });
  it('в режиме «Округ» показаны чипы округов, «каждый в городе» доступен', () => {
    const onChange = vi.fn();
    render(<GeoScope value={{ ...DEFAULT_GEO_FORM, scopeKind: 'district' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'ПФО' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_GEO_FORM,
      scopeKind: 'district',
      district: 'pfo',
    });
    const every = screen.getByRole('button', { name: /каждого провайдера/ });
    expect((every as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(every);
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_GEO_FORM,
      scopeKind: 'district',
      isp: '__ALL__',
    });
  });
  it('«каждый в городе» недоступен для всей РФ', () => {
    render(<GeoScope value={DEFAULT_GEO_FORM} onChange={vi.fn()} />);
    expect(
      (screen.getByRole('button', { name: /каждого провайдера/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
  it('города: найденный город добавляется чипом, повтор не дублирует, чип убирает', () => {
    const onChange = vi.fn();
    const withCity = {
      ...DEFAULT_GEO_FORM,
      scopeKind: 'cities' as const,
      cities: [{ region: 'voronezh_oblast', city: 'voronezh' }],
    };
    const { rerender } = render(
      <GeoScope value={{ ...DEFAULT_GEO_FORM, scopeKind: 'cities' }} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText('Найти город…'), { target: { value: 'вор' } });
    fireEvent.click(screen.getByRole('button', { name: /Воронеж/ }));
    expect(onChange).toHaveBeenLastCalledWith(withCity);
    rerender(<GeoScope value={withCity} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Воронеж · Воронежская/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Убрать город/ }));
    expect(onChange).toHaveBeenLastCalledWith({ ...withCity, cities: [] });
  });
});
