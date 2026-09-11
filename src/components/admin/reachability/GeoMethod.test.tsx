// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { GeoMethod } from './GeoMethod';
import { DEFAULT_GEO_FORM } from './geoForm';

afterEach(cleanup);

const base = {
  core: '' as const,
  onCoreChange: vi.fn(),
  cores: { stable: '26.3.27', prerelease: '26.7.11' },
  heavyAllowed: true,
  hostsSelected: false,
  hasTunnel: false,
};

describe('GeoMethod', () => {
  it('TCP и TLS чипами; тяжёлая проба недоступна в TCP и без доменной цели', () => {
    const onChange = vi.fn();
    render(<GeoMethod {...base} value={DEFAULT_GEO_FORM} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'TCP-порт' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GEO_FORM, probeMode: 'tcp' });
    const heavy = screen.getByRole('checkbox');
    expect((heavy as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(heavy);
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GEO_FORM, heavy: true });
    cleanup();
    render(
      <GeoMethod {...base} value={{ ...DEFAULT_GEO_FORM, probeMode: 'tcp' }} onChange={onChange} />,
    );
    expect((screen.getByRole('checkbox') as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    render(
      <GeoMethod {...base} heavyAllowed={false} value={DEFAULT_GEO_FORM} onChange={onChange} />,
    );
    expect((screen.getByRole('checkbox') as HTMLButtonElement).disabled).toBe(true);
  });
  it('ядро Xray с номерами версий показано только при туннеле', () => {
    render(<GeoMethod {...base} hasTunnel value={DEFAULT_GEO_FORM} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Stable 26.3.27' })).toBeTruthy();
    cleanup();
    render(<GeoMethod {...base} value={DEFAULT_GEO_FORM} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Stable/ })).toBeNull();
  });
});
