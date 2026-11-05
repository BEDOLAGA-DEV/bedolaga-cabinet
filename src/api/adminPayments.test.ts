import { describe, expect, it, vi } from 'vitest';
import apiClient from './client';
import { adminPaymentsApi } from './adminPayments';

vi.mock('./client', () => ({ default: { get: vi.fn().mockResolvedValue({ data: {} }) } }));

describe('admin payment source identity', () => {
  it('opens landing details without selecting a provider invoice with the same id', async () => {
    await adminPaymentsApi.getPayment('platega', 1, 'landing');
    expect(apiClient.get).toHaveBeenLastCalledWith('/cabinet/admin/payments/platega/1', {
      params: { source: 'landing' },
    });
  });
});
