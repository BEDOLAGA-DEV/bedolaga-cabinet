// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TariffDeviceSelector } from './TariffDeviceSelector';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

it('allows only whole device counts inside server limits', () => {
  const change = vi.fn();
  const validity = vi.fn();
  render(
    <TariffDeviceSelector
      value={1}
      min={1}
      max={5}
      included={1}
      onChange={change}
      onValidityChange={validity}
    />,
  );
  const input = screen.getByRole('spinbutton');
  fireEvent.change(input, { target: { value: '3' } });
  expect(change).toHaveBeenCalledWith(3);
  change.mockClear();
  for (const value of ['0', '6', '1.5', '']) {
    fireEvent.change(input, { target: { value } });
    expect(change).not.toHaveBeenCalled();
    expect(validity).toHaveBeenLastCalledWith(false);
  }
});

it('supports large configured limits without a hardcoded ceiling of 100', () => {
  const change = vi.fn();
  render(
    <TariffDeviceSelector
      value={1}
      min={1}
      max={10000}
      included={1}
      onChange={change}
      onValidityChange={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '500' } });
  expect(change).toHaveBeenCalledWith(500);
});

it('disables decrement at the included limit', () => {
  render(
    <TariffDeviceSelector
      value={1}
      min={1}
      max={5}
      included={1}
      onChange={vi.fn()}
      onValidityChange={vi.fn()}
    />,
  );
  expect(
    (
      screen.getByRole('button', {
        name: 'subscription.purchaseDevices.decrease',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

it('explains both the included minimum and the tariff maximum before input errors', () => {
  render(
    <TariffDeviceSelector
      value={3}
      min={3}
      max={8}
      included={3}
      onChange={vi.fn()}
      onValidityChange={vi.fn()}
    />,
  );
  expect(screen.getByText('subscription.purchaseDevices.includedReason')).toBeTruthy();
  expect(screen.getByText('subscription.purchaseDevices.limitReason')).toBeTruthy();
});
