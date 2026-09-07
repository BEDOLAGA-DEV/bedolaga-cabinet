// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReachabilityStatus } from '@/api/reachability';

/**
 * Выключенный или ненастроенный BSCHEKER не должен встречать админа пустой страницей:
 * шаги с отметками по статусу, ссылка прямо в раздел настроек, ссылка за ключом на bsbord.com.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { SetupGuide } from './SetupGuide';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

const base: ReachabilityStatus = {
  enabled: false,
  configured: true,
  healthy: true,
  health_message: null,
  balance_kopeks: null,
  bonus_kopeks: null,
  tier: null,
  tier_expires_at: null,
  min_interval_sec: null,
  active_jobs: [],
  reference: null,
  cost_limit_kopeks: 0,
  cores: {},
  default_sni: null,
  active_batch: null,
};

describe('SetupGuide', () => {
  it('выключено: ключ уже есть — отмечен, включение — нет; ссылка ведёт в раздел BSCHEKER настроек', () => {
    renderWithProviders(<SetupGuide status={base} />);
    expect(screen.getByRole('heading', { name: 'BSCHEKER выключен' })).toBeTruthy();
    const steps = screen.getAllByRole('listitem');
    expect(steps.map((step) => step.getAttribute('data-done'))).toEqual([
      'true',
      'false',
      'false',
      null,
    ]);
    expect(
      screen.getByRole('link', { name: 'Открыть настройки BSCHEKER' }).getAttribute('href'),
    ).toBe('/admin/settings?section=sys_reachability');
  });

  it('не настроено: другой заголовок, кнопка открывает bsbord.com через платформу', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithProviders(<SetupGuide status={{ ...base, enabled: true, configured: false }} />);
    expect(screen.getByRole('heading', { name: 'BSCHEKER не настроен' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Получить ключ на bsbord.com' }));
    expect(open).toHaveBeenCalledWith('https://bsbord.com', '_blank', 'noopener');
    open.mockRestore();
  });
});
