// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HostTarget } from '@/api/reachability';

/** Хосты под Белый список — главный предмет проверки: их можно отметить одним явным действием. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: { getHosts: vi.fn(), updatePref: vi.fn() },
}));

import { reachabilityApi } from '@/api/reachability';
import { HostsTargetList } from './HostsTargetList';
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
beforeEach(() => vi.mocked(reachabilityApi.getHosts).mockResolvedValue(HOSTS));
afterEach(cleanup);

describe('HostsTargetList', () => {
  it('быстрый выбор отмечает только ещё не отмеченные хосты под БС', async () => {
    const onToggle = vi.fn();
    renderWithProviders(<HostsTargetList selected={[HOSTS[0]]} onToggle={onToggle} />);
    await screen.findByText('BS1');

    fireEvent.click(screen.getByRole('button', { name: /отметить хосты под БС \(1\)/ }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(HOSTS[2]);
  });
});
