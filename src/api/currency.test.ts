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
const primary = { data: { success: true, rates: { USD: 0.01, CNY: 0.1, IRR: 500 } } };
const backup = { data: { rates: { USD: 0.02, CNY: 0.2, IRR: 400 } } };

it('uses the backup after a primary network failure and caches its rates', async () => {
  vi.mocked(axios.get)
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce(backup);
  const { currencyApi } = await import('./currency');
  expect(await currencyApi.getExchangeRates()).toEqual({ USD: 50, CNY: 5, IRR: 0.0025 });
  expect(axios.get).toHaveBeenNthCalledWith(2, 'https://open.er-api.com/v6/latest/RUB');
  expect(await currencyApi.getExchangeRates()).toEqual({ USD: 50, CNY: 5, IRR: 0.0025 });
  expect(axios.get).toHaveBeenCalledTimes(2);
});

it('uses a valid primary response without calling the backup', async () => {
  vi.mocked(axios.get).mockResolvedValueOnce(primary);
  const { currencyApi } = await import('./currency');
  expect(await currencyApi.getExchangeRates()).toEqual({ USD: 100, CNY: 10, IRR: 0.002 });
  expect(axios.get).toHaveBeenCalledTimes(1);
});

it.each([null, { success: false }, { success: true, rates: { USD: -1, CNY: 0, IRR: 'bad' } }])(
  'tries the backup for invalid primary data %j',
  async (data) => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data }).mockResolvedValueOnce(backup);
    const { currencyApi } = await import('./currency');
    expect(await currencyApi.getExchangeRates()).toEqual({ USD: 50, CNY: 5, IRR: 0.0025 });
  },
);

it('uses defaults if both sources fail, without caching a transport failure', async () => {
  vi.mocked(axios.get)
    .mockRejectedValueOnce(new Error('Primary down'))
    .mockRejectedValueOnce(new Error('Backup down'))
    .mockResolvedValueOnce(primary);
  const { currencyApi } = await import('./currency');
  expect(await currencyApi.getExchangeRates()).toEqual(FALLBACK_RATES);
  expect(await currencyApi.getExchangeRates()).toEqual({ USD: 100, CNY: 10, IRR: 0.002 });
  expect(axios.get).toHaveBeenCalledTimes(3);
});
