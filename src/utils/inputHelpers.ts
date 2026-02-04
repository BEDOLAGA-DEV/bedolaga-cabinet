import { ChangeEvent } from 'react';

/**
 * Creates an onChange handler for number inputs that allows empty values while typing.
 * This fixes the issue where inputs can't be cleared because `parseInt('') || 0` immediately fills with 0.
 *
 * @param setter - The state setter function
 * @param min - Optional minimum value constraint
 * @param max - Optional maximum value constraint
 */
export function createNumberInputHandler(
  setter: (value: number | '') => void,
  min?: number,
  max?: number,
) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (val === '') {
      setter('');
      return;
    }

    let num = parseFloat(val);

    if (isNaN(num)) return;

    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);

    setter(num);
  };
}

/**
 * Converts a number|'' state value to a number, using a default for empty.
 */
export function toNumber(value: number | '', defaultValue = 0): number {
  return value === '' ? defaultValue : value;
}

/**
 * Gets the display value for a kopeks field (converts to rubles).
 * Returns '' if the value is empty, otherwise divides by 100.
 */
export function kopeksToDisplay(value: number | ''): number | '' {
  return value === '' ? '' : value / 100;
}
