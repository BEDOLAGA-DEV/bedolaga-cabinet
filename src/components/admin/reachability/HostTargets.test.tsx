// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HostTarget } from '@/api/reachability';

/** Хосты под Белый список — предмет проверки: отмечаются одной кнопкой с говорящим названием. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    notify: vi.fn(),
  }),
}));
vi.mock('@/api/reachability', () => ({
  reachabilityApi: { getHosts: vi.fn(), getNodes: vi.fn(), updatePref: vi.fn() },
}));

import { reachabilityApi } from '@/api/reachability';
import { HostTargets } from './HostTargets';
import { installMatchMedia, renderWithProviders } from './testUtils';

const host = (uuid: string, purpose: HostTarget['purpose']): HostTarget => ({
  uuid,
  remark: uuid.toUpperCase(),
  address: `${uuid}.example`,
  port: 443,
  sni: null,
  is_disabled: false,
  tag: null,
  purpose,
  purpose_guessed: false,
  excluded: false,
  node_uuids: [],
  target_key: `${uuid}.example:443`,
});
const HOSTS = [host('bs1', 'bs'), host('eu1', 'regular'), host('bs2', 'bs')];

installMatchMedia();
beforeEach(() => {
  vi.mocked(reachabilityApi.getHosts).mockResolvedValue(HOSTS);
  vi.mocked(reachabilityApi.getNodes).mockResolvedValue([]);
  vi.mocked(reachabilityApi.updatePref).mockResolvedValue({
    target_kind: 'host',
    target_ref: 'bs1',
    purpose: 'regular',
    excluded: false,
    note: null,
  });
});
afterEach(cleanup);

function render(selected: HostTarget[], onToggleHost = vi.fn()) {
  renderWithProviders(
    <HostTargets hosts={selected} onToggleHost={onToggleHost} nodes={[]} onToggleNode={vi.fn()} />,
  );
  return onToggleHost;
}

describe('HostTargets', () => {
  it('«Отметить все хосты под БС» отмечает только ещё не отмеченные', async () => {
    const onToggleHost = render([HOSTS[0]]);
    await screen.findByText('BS1');
    fireEvent.click(screen.getByRole('button', { name: 'Отметить все под Белый список' }));
    expect(onToggleHost).toHaveBeenCalledTimes(1);
    expect(onToggleHost).toHaveBeenCalledWith(HOSTS[2]);
  });

  it('строка хоста — переключатель, тап по тегу меняет назначение, а не выбор', async () => {
    const onToggleHost = render([]);
    await screen.findByText('EU1');
    fireEvent.click(screen.getByRole('button', { name: /Сменить назначение хоста: обычный/ }));
    await waitFor(() => expect(reachabilityApi.updatePref).toHaveBeenCalledTimes(1));
    expect(reachabilityApi.updatePref).toHaveBeenCalledWith({
      target_kind: 'host',
      target_ref: 'eu1',
      purpose: 'bs',
    });
    expect(onToggleHost).not.toHaveBeenCalled();
  });

  it('без абзаца про тег: определение Белого списка по знаку вопроса; адрес без sni', async () => {
    render([]);
    await screen.findByText('BS1');
    expect(screen.queryByText(/Тег у хоста/)).toBeNull();
    expect(screen.queryByText(/sni /)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Что такое Белый список?' }));
    expect(screen.getByText(/Белый список — режим оператора/)).toBeTruthy();
  });
});
