// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TariffDeviceSelector } from './TariffDeviceSelector';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);

it('offers exactly the server range, including a minimum above one', () => {
  const change = vi.fn();
  render(
    <TariffDeviceSelector
      value={3}
      min={3}
      max={5}
      included={3}
      onChange={change}
      onValidityChange={vi.fn()}
    />,
  );
  expect(
    screen.getAllByRole('option').map((option) => (option as HTMLOptionElement).value),
  ).toEqual(['3', '4', '5']);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
  expect(change).toHaveBeenCalledWith(5);
  expect(screen.queryByRole('spinbutton')).toBeNull();
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
  expect(screen.getAllByRole('option').length).toBeLessThanOrEqual(21);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'custom' } });
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '500' } });
  expect(change).toHaveBeenCalledWith(500);
});

it('blocks invalid custom counts and restores validity when choosing a preset', () => {
  const change = vi.fn();
  const validity = vi.fn();
  render(
    <TariffDeviceSelector
      value={3}
      min={3}
      max={10000}
      included={3}
      onChange={change}
      onValidityChange={validity}
    />,
  );
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'custom' } });
  for (const value of ['0', '2', '10001', '3.5', '']) {
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value } });
    expect(change).not.toHaveBeenCalled();
    expect(validity).toHaveBeenLastCalledWith(false);
  }
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
  expect(change).toHaveBeenLastCalledWith(4);
  expect(validity).toHaveBeenLastCalledWith(true);
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
