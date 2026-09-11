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

import { GeoTargets, parseGeoAddresses } from './GeoTargets';

afterEach(cleanup);

describe('parseGeoAddresses', () => {
  it('адреса через запятую и построчно, без дублей; подсеть отделяется', () => {
    expect(parseGeoAddresses('a.example, b.example\n a.example \n192.0.2.0/24')).toEqual({
      targets: ['a.example', 'b.example'],
      hasCidr: true,
    });
  });
});

describe('GeoTargets', () => {
  it('хост панели отмечается галочкой, счётчик считает все три источника', () => {
    const onHosts = vi.fn();
    render(
      <GeoTargets
        hosts={[]}
        onHostsChange={onHosts}
        addresses={'example.com\nya.ru'}
        onAddressesChange={vi.fn()}
        configCount={1}
        configPicker={<div>picker</div>}
      />,
    );
    expect(screen.getByText('целей 3 из 20')).toBeTruthy();
    expect(screen.getByText('picker')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /DE/ }));
    expect(onHosts).toHaveBeenCalledWith(['h-1']);
  });
  it('подсеть в поле адресов — подсказка про вкладку CIDR; сверх 20 целей — предупреждение', () => {
    render(
      <GeoTargets
        hosts={['h-1', 'h-2']}
        onHostsChange={vi.fn()}
        addresses={[...Array(19).keys()].map((i) => `s${i}.example`).join(',')}
        onAddressesChange={vi.fn()}
        configCount={0}
        configPicker={null}
      />,
    );
    expect(screen.getByText('целей 21 из 20')).toBeTruthy();
    expect(screen.getByText(/Не больше 20 целей/)).toBeTruthy();
    cleanup();
    render(
      <GeoTargets
        hosts={[]}
        onHostsChange={vi.fn()}
        addresses="192.0.2.0/24"
        onAddressesChange={vi.fn()}
        configCount={0}
        configPicker={null}
      />,
    );
    expect(screen.getByText(/CIDR/)).toBeTruthy();
  });
});
