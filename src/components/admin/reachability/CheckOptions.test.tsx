// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Пробы, SNI-хост и ядро Xray всегда на виду: ничего не спрятано за «Дополнительно». */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { CheckOptions } from './CheckOptions';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

describe('CheckOptions', () => {
  it('пробы и поле SNI видны сразу под заголовком «Пробы»', () => {
    renderWithProviders(
      <CheckOptions
        probes={{ icmp: false, tcp: true, sni: true }}
        onProbesChange={vi.fn()}
        sniHosts="ads.x5.ru"
        onSniChange={vi.fn()}
        autoSniNames={[]}
        showSni
      />,
    );
    expect(screen.getByRole('heading', { name: 'Пробы' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^ICMP/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /TLS-SNI/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('textbox', { name: 'SNI-хост' })).toBeTruthy();
    expect(screen.queryByText(/Дополнительно/)).toBeNull();
  });

  it('без SNI-пробы поле SNI-хоста не показывается', () => {
    renderWithProviders(
      <CheckOptions
        probes={{ icmp: true, tcp: true, sni: false }}
        onProbesChange={vi.fn()}
        sniHosts="ads.x5.ru"
        onSniChange={vi.fn()}
        autoSniNames={[]}
        showSni={false}
      />,
    );
    expect(screen.queryByRole('textbox', { name: 'SNI-хост' })).toBeNull();
  });

  it('ядро Xray для подписки: версии номером под своим заголовком', () => {
    renderWithProviders(
      <CheckOptions
        core=""
        onCoreChange={vi.fn()}
        cores={{ stable: '26.3.27', prerelease: '26.7.11' }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Ядро Xray' })).toBeTruthy();
    const chips = screen.getByRole('group', { name: 'Ядро Xray' });
    expect(chips.textContent).toContain('26.3.27');
    expect(chips.textContent).not.toContain('Stable');
  });
});
