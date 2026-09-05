// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReferenceStatus } from '@/api/reachability';

/**
 * Вкладка «Подписка» не должна упираться в «выберите цель» без объяснений: без подписки
 * по умолчанию — говорим, что делать, и ведём в настройки; ядро Xray подписано номером версии.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/adminUsers', () => ({ adminUsersApi: { getUsers: vi.fn() } }));

import { SubscriptionTargets } from './SubscriptionTargets';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

const CORES = { stable: '26.3.27', prerelease: '26.7.11' };
const missing: ReferenceStatus = { short_uuid: null, configs: 0, rejected: 0, error: 'не задана' };
const ready: ReferenceStatus = { short_uuid: 'ref-1', configs: 3, rejected: 0, error: null };

function render(reference: ReferenceStatus | null) {
  renderWithProviders(
    <SubscriptionTargets
      userId={null}
      shortUuid={null}
      onSource={vi.fn()}
      data={undefined}
      isLoading={false}
      error={null}
      selected={[]}
      onToggle={vi.fn()}
      core=""
      onCoreChange={vi.fn()}
      reference={reference}
      cores={CORES}
    />,
  );
}

describe('SubscriptionTargets', () => {
  it('без подписки по умолчанию объясняет, что делать, и ведёт в настройки', () => {
    render(missing);
    expect(screen.getByText('Подписка по умолчанию не задана')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Открыть настройки' }).getAttribute('href')).toBe(
      '/admin/settings',
    );
    expect(
      screen.getByRole('searchbox', { name: 'Подставить подписку пользователя' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /подписка по умолчанию/ })).toBeNull();
  });

  it('с подпиской по умолчанию показывает её как источник, ядро Xray — номером версии', () => {
    render(ready);
    expect(screen.getByRole('button', { name: /подписка по умолчанию/ })).toBeTruthy();
    expect(screen.queryByText('Подписка по умолчанию не задана')).toBeNull();
    const chips = screen.getByRole('group', { name: 'Ядро Xray' });
    expect(chips.textContent).toContain('26.3.27');
    expect(chips.textContent).toContain('26.7.11');
    expect(chips.textContent).not.toContain('Stable');
  });
});
