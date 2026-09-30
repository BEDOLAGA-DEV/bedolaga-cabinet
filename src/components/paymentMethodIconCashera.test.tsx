// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { METHOD_LABELS } from '../constants/paymentMethods';
import PaymentMethodIcon from './PaymentMethodIcon';

afterEach(cleanup);

it('у Cashera своя подпись и иконка, а не заглушка неизвестного метода', () => {
  expect(METHOD_LABELS.cashera).toBe('Cashera');

  const cashera = render(<PaymentMethodIcon method="cashera" />).container.innerHTML;
  cleanup();
  const unknown = render(<PaymentMethodIcon method="definitely_unknown_method" />).container
    .innerHTML;

  expect(cashera).toContain('-cashera');
  expect(cashera).not.toBe(unknown);
});
