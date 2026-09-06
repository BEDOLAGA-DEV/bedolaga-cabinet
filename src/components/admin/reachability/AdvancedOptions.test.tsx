// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Пробы и SNI свёрнуты в «Дополнительно» с итогом одной строкой: умолчания уже правильные. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { AdvancedOptions } from './AdvancedOptions';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

describe('AdvancedOptions', () => {
  it('свёрнуто: одна строка с текущими пробами и SNI; раскрытие показывает переключатели', () => {
    renderWithProviders(
      <AdvancedOptions
        probes={{ icmp: false, tcp: true, sni: true }}
        onProbesChange={vi.fn()}
        sniHosts="ads.x5.ru"
        onSniChange={vi.fn()}
        autoSniNames={[]}
        showSni
      />,
    );
    expect(screen.getByText('Пробы: TCP, TLS-SNI · SNI: ads.x5.ru')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'SNI-хост' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Дополнительно/ }));
    expect(screen.getByRole('textbox', { name: 'SNI-хост' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^ICMP/ })).toBeTruthy();
  });

  it('ядро Xray для подписки: свёрнуто «Авто», в раскрытии — версии номером', () => {
    renderWithProviders(
      <AdvancedOptions
        core=""
        onCoreChange={vi.fn()}
        cores={{ stable: '26.3.27', prerelease: '26.7.11' }}
      />,
    );
    expect(screen.getByText('Ядро Xray: Авто')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Дополнительно/ }));
    const chips = screen.getByRole('group', { name: 'Ядро Xray' });
    expect(chips.textContent).toContain('26.3.27');
    expect(chips.textContent).not.toContain('Stable');
  });
});
