// @vitest-environment jsdom
import type { UseQueryResult } from '@tanstack/react-query';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedInput, ReferenceStatus, SubscriptionConfigs } from '@/api/reachability';

/**
 * Вкладка «VPN-тест»: подписка по умолчанию первой строкой с именем и числом конфигов; без неё
 * говорим, что делать; поле «Конфиг или подписка» ниже; с заполненным полем показываются
 * разобранные конфиги, готовые источники прячутся.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/adminUsers', () => ({ adminUsersApi: { getUsers: vi.fn() } }));

import { type ConfigItem, SubscriptionTargets } from './SubscriptionTargets';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

const missing: ReferenceStatus = { short_uuid: null, configs: 0, rejected: 0, error: 'не задана' };
const ready: ReferenceStatus = { short_uuid: 'ref-1', configs: 3, rejected: 0, error: null };

const idle = <T,>(data?: T) =>
  ({
    data,
    error: null,
    isLoading: false,
    isFetching: false,
    isError: false,
  }) as unknown as UseQueryResult<T>;

const item = (index: number, label: string): ConfigItem => ({
  index,
  protocol: 'vless',
  label,
  address: `${label.toLowerCase()}.example`,
  port: 443,
  sni: null,
  target_key: `${label.toLowerCase()}.example:443`,
  purpose: 'regular',
  target: { kind: 'custom', value: `vless://u@${label.toLowerCase()}.example:443#${label}` },
});

function render(
  reference: ReferenceStatus | null,
  overrides: Partial<Parameters<typeof SubscriptionTargets>[0]> = {},
) {
  renderWithProviders(
    <SubscriptionTargets
      pasted=""
      onPastedChange={vi.fn()}
      parsed={idle<ParsedInput>()}
      userId={null}
      shortUuid={null}
      onSource={vi.fn()}
      subscription={idle<SubscriptionConfigs>()}
      reference={reference}
      list={[]}
      rejected={[]}
      selected={[]}
      onToggle={vi.fn()}
      onSelectMany={vi.fn()}
      onClear={vi.fn()}
      {...overrides}
    />,
  );
}

describe('SubscriptionTargets', () => {
  it('поле «Конфиг или подписка» есть; без подписки по умолчанию объясняет, что делать', () => {
    render(missing);
    expect(screen.getByRole('textbox', { name: 'Конфиг или подписка' })).toBeTruthy();
    expect(screen.getByText('Подписка по умолчанию не задана')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Открыть настройки' }).getAttribute('href')).toBe(
      '/admin/settings?section=sys_reachability',
    );
    expect(
      screen.getByRole('searchbox', { name: 'Подставить подписку пользователя' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /подписка по умолчанию/ })).toBeNull();
  });

  it('с подпиской по умолчанию показывает её как источник', () => {
    render(ready);
    const chip = screen.getByRole('button', { name: /подписка по умолчанию/ });
    expect(chip.textContent).toContain('ref-1');
    expect(chip.textContent).toContain('3 конфига');
    expect(screen.queryByText('Подписка по умолчанию не задана')).toBeNull();
  });

  it('с заполненным полем показывает разобранные конфиги и прячет готовые источники', () => {
    const parsed: ParsedInput = {
      configs: [item(0, 'Germany'), item(1, 'Poland')],
      rejected: [{ reason: 'stub', preview: '0.0.0.0:1' }],
      sources: [{ kind: 'subscription', label: 'https://sub.example/x', count: 2 }],
    };
    render(ready, {
      pasted: 'https://sub.example/x',
      parsed: idle(parsed),
      list: parsed.configs,
      rejected: parsed.rejected,
      selected: [0, 1],
    });
    expect(screen.getByText('Germany')).toBeTruthy();
    expect(screen.getByText('подписка · 2')).toBeTruthy();
    expect(screen.getByText('выбрано 2 / 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /подписка по умолчанию/ })).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});
