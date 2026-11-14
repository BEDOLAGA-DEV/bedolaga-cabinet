import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import axios from 'axios';
import { FALLBACK_RATES } from '../utils/currencyUnits';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
beforeEach(() => {
  vi.resetModules();
  vi.mocked(axios.get).mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});
const live = { data: { result: 'success', rates: { USD: 0.02, CNY: 0.2, IRR: 400 } } };

it('uses the live open.er-api.com response and caches its rates', async () => {
  vi.mocked(axios.get).mockResolvedValueOnce(live);
  const { currencyApi } = await import('./currency');
  expect(await currencyApi.getExchangeRates()).toEqual({ USD: 50, CNY: 5, IRR: 0.0025 });
  expect(axios.get).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/RUB');
  expect(await currencyApi.getExchangeRates()).toEqual({ USD: 50, CNY: 5, IRR: 0.0025 });
  expect(axios.get).toHaveBeenCalledTimes(1);
});

it.each([null, { result: 'error' }, { result: 'success', rates: { USD: -1, CNY: 0, IRR: 'bad' } }])(
  'falls back to FALLBACK_RATES for invalid data %j without caching it',
  async (data) => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data }).mockResolvedValueOnce(live);
    const { currencyApi } = await import('./currency');
    expect(await currencyApi.getExchangeRates()).toEqual(FALLBACK_RATES);
    expect(await currencyApi.getExchangeRates()).toEqual({ USD: 50, CNY: 5, IRR: 0.0025 });
    expect(axios.get).toHaveBeenCalledTimes(2);
  },
);

it('uses defaults on a network failure, without caching the transport failure', async () => {
  vi.mocked(axios.get)
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce(live);
  const { currencyApi } = await import('./currency');
  expect(await currencyApi.getExchangeRates()).toEqual(FALLBACK_RATES);
  expect(await currencyApi.getExchangeRates()).toEqual({ USD: 50, CNY: 5, IRR: 0.0025 });
  expect(axios.get).toHaveBeenCalledTimes(2);
});
