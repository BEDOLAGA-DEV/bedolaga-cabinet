// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('./useTargets', () => ({
  useHosts: () => ({
    data: [
      {
        uuid: 'h-1',
        remark: 'DE',
        address: 'de.example',
        port: 443,
        sni: null,
        is_disabled: false,
        tag: null,
        purpose: 'regular',
        purpose_guessed: false,
        excluded: false,
        node_uuids: [],
        target_key: 'de.example:443',
      },
      {
        uuid: 'h-2',
        remark: 'RU-BS',
        address: 'ru.example',
        port: 9443,
        sni: 'ads.x5.ru',
        is_disabled: false,
        tag: null,
        purpose: 'bs',
        purpose_guessed: false,
        excluded: false,
        node_uuids: [],
        target_key: 'ru.example:9443',
      },
    ],
    isLoading: false,
  }),
}));

import { GeoTargets, geoTargetsCount, parseGeoAddresses } from './GeoTargets';
import type { GeoTargetKind } from './geoForm';

afterEach(cleanup);

const base = {
  hosts: [] as string[],
  onHostsChange: vi.fn(),
  addresses: '',
  onAddressesChange: vi.fn(),
  configCount: 0,
  configPicker: <div>picker</div>,
  onKindChange: vi.fn(),
};

describe('parseGeoAddresses', () => {
  it('адреса через запятую и построчно, без дублей; подсеть отделяется', () => {
    expect(parseGeoAddresses('a.example, b.example\n a.example \n192.0.2.0/24')).toEqual({
      targets: ['a.example', 'b.example'],
      hasCidr: true,
    });
  });
  it('счётчик целей — только выбранного вида', () => {
    const counts = { hosts: 2, addresses: 5, configs: 1 };
    expect(geoTargetsCount('hosts', counts)).toBe(2);
    expect(geoTargetsCount('addresses', counts)).toBe(5);
    expect(geoTargetsCount('vless', counts)).toBe(1);
  });
});

// Точная подпись поля адресов из ru.json: регулярка без якорей ловила бы адрес «где угодно».
const ADDRESS_PLACEHOLDER = 'example.com · 1.2.3.4:443 · https://… — через запятую или построчно';

describe('GeoTargets', () => {
  it('один вид за раз: хосты панели галочками, адреса текстом, VLESS — блок конфига', () => {
    const onKind = vi.fn();
    const { rerender } = render(<GeoTargets {...base} kind="hosts" onKindChange={onKind} />);
    expect(screen.getByRole('button', { name: /DE/ })).toBeTruthy();
    expect(screen.queryByPlaceholderText(ADDRESS_PLACEHOLDER)).toBeNull();
    expect(screen.queryByText('picker')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'IP / Домен' }));
    expect(onKind).toHaveBeenCalledWith('addresses');
    rerender(<GeoTargets {...base} kind="addresses" onKindChange={onKind} />);
    expect(screen.getByPlaceholderText(ADDRESS_PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /DE/ })).toBeNull();
    rerender(<GeoTargets {...base} kind="vless" onKindChange={onKind} configCount={1} />);
    expect(screen.getByText('picker')).toBeTruthy();
    expect(screen.getByText('целей 1 из 20')).toBeTruthy();
  });
  it('хост панели отмечается галочкой; счётчик не смешивает виды', () => {
    const onHosts = vi.fn();
    render(
      <GeoTargets
        {...base}
        kind="hosts"
        onHostsChange={onHosts}
        addresses={'example.com\nya.ru'}
        configCount={1}
      />,
    );
    expect(screen.getByText('целей 0 из 20')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /DE/ }));
    expect(onHosts).toHaveBeenCalledWith(['h-1']);
  });
  it('подсеть в поле адресов — подсказка про вкладку CIDR; сверх 20 целей — предупреждение', () => {
    const many = [...Array(21).keys()].map((i) => `s${i}.example`).join(',');
    render(<GeoTargets {...base} kind="addresses" addresses={many} />);
    expect(screen.getByText('целей 21 из 20')).toBeTruthy();
    expect(screen.getByText(/Не больше 20 целей/)).toBeTruthy();
    cleanup();
    render(<GeoTargets {...base} kind="addresses" addresses="192.0.2.0/24" />);
    expect(screen.getByText(/CIDR/)).toBeTruthy();
  });
  it('у каждого вида своя подсказка под заголовком', () => {
    const kinds: GeoTargetKind[] = ['hosts', 'addresses', 'vless'];
    for (const kind of kinds) {
      render(<GeoTargets {...base} kind={kind} />);
      expect(
        screen.getByText(
          kind === 'hosts'
            ? /серверы панели/
            : kind === 'addresses'
              ? /через запятую или с новой строки/
              : /hysteria2/,
        ),
      ).toBeTruthy();
      cleanup();
    }
  });
});
