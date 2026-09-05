// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/** Детали задачи — обычная модалка по образцу GeoCheckModal, а не выезжающая снизу панель. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { getJob: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { JobDetailsModal } from './JobDetailsModal';
import { installMatchMedia, renderWithProviders } from './testUtils';

const job = {
  id: 2,
  kind: 'vless',
  status: 'done',
  targets: [],
  legs: [],
  cost_kopeks: 103,
  refunded_kopeks: 0,
  estimate_is_exact: true,
  error_code: null,
  error_message: null,
  result: { state: 'done' },
} as unknown as Job;

installMatchMedia();
beforeEach(() => vi.mocked(reachabilityApi.getJob).mockResolvedValue(job));
afterEach(cleanup);

describe('JobDetailsModal', () => {
  it('открывается как диалог с заголовком задачи и закрывается по Escape', async () => {
    const onClose = vi.fn();
    renderWithProviders(<JobDetailsModal jobId={2} onClose={onClose} />);

    const dialog = await screen.findByRole('dialog', { name: 'Задача #2' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    await screen.findByText('1,03 ₽');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('без задачи ничего не рисует', () => {
    renderWithProviders(<JobDetailsModal jobId={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
