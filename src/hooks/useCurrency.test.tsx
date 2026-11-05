// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { currencyApi } from '../api/currency';
import { formatPrice, setExchangeRates } from '../utils/format';
import fa from '../locales/fa.json';
import { useCurrency } from './useCurrency';

const language = vi.hoisted(() => ({ value: 'fa' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: language.value },
    t: () => fa.common.currency,
  }),
}));
const rates = { USD: 100, CNY: 10, IRR: 0.001 };
afterEach(() => {
  cleanup();
  setExchangeRates(null);
  language.value = 'fa';
});
function hook(lang = 'fa') {
  language.value = lang;
  const client = new QueryClient();
  client.setQueryData(['exchange-rates'], rates);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCurrency(), { wrapper }).result;
}
it('uses tomans for Persian display and converts typed tomans back to RUB', () => {
  const result = hook();
  expect(result.current.convertAmount(50)).toBe(5000);
  expect(result.current.formatAmount(50)).toBe('۵٬۰۰۰');
  expect(result.current.formatWithCurrency(50)).toBe('۵٬۰۰۰\u00a0تومان');
  expect(result.current.convertToRub(5000)).toBe(50);
  expect(result.current.convertToRub(1234)).toBeCloseTo(12.34);
});
it('formats landing prices in the same toman unit as the hook', () => {
  const result = hook();
  expect(formatPrice(5000, 'fa')).toBe(result.current.formatWithCurrency(50));
});
it.each([
  ['ru', 50],
  ['en', 0.5],
  ['zh', 5],
] as const)('preserves %s conversion and inverse', (lang, expected) => {
  const result = hook(lang);
  expect(result.current.convertAmount(50)).toBe(expected);
  expect(result.current.convertToRub(expected)).toBe(50);
});
it('keeps the ISO IRR conversion in rials', () => {
  expect(currencyApi.convertFromRub(50, 'IRR', rates)).toBe(50000);
  expect(currencyApi.convertToRub(50000, 'IRR', rates)).toBe(50);
});

it('converts typed tomans back to RUB independently of formatting', () => {
  expect(hook().current.convertToRub(5000)).toBe(50);
});
it('uses the same fallback toman unit before exchange rates are loaded', () => {
  expect(formatPrice(2400, 'fa')).toBe('۱٬۰۰۰\u00a0تومان');
});
