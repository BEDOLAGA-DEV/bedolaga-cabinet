// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Вкладка «CIDR»: одна подсеть /24; из IP берётся его подсеть, и это видно до запуска. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: { getHosts: vi.fn().mockResolvedValue([]) },
}));

import { ScanTargets } from './ScanTargets';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

describe('ScanTargets', () => {
  it('поле называется CIDR, IP превращается в подсеть /24', () => {
    renderWithProviders(<ScanTargets cidr="192.0.2.10" onChange={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: 'CIDR' }) as HTMLInputElement;
    expect(field.value).toBe('192.0.2.10');
    expect(field.placeholder).toBe('192.0.2.0/24');
    expect(screen.getByText('В скан пойдёт подсеть 192.0.2.0/24')).toBeTruthy();
  });

  it('домен или другая маска не годятся', () => {
    renderWithProviders(<ScanTargets cidr="10.0.0.0/16" onChange={vi.fn()} />);
    expect(screen.getByText('Нужна подсеть /24 или IPv4-адрес')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'CIDR' }).getAttribute('aria-invalid')).toBe('true');
  });
});
