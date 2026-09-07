// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Ввод из поля быстрой проверки (?q=) подставляется в поле своей вкладки. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: {
    getUnits: vi.fn(),
    getHosts: vi.fn(),
    getNodes: vi.fn(),
    previewJob: vi.fn(),
    parseInput: vi.fn(),
    getSubscriptionConfigs: vi.fn(),
    getJob: vi.fn(),
  },
}));
vi.mock('@/platform/hooks/useNotify', () => ({
  useNotify: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));

import { reachabilityApi } from '@/api/reachability';
import { Launcher } from './Launcher';
import { OTHER_MODES, parseReachabilityDeepLink } from './deepLink';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
beforeEach(() => {
  vi.mocked(reachabilityApi.getUnits).mockResolvedValue([]);
  vi.mocked(reachabilityApi.getHosts).mockResolvedValue([]);
  vi.mocked(reachabilityApi.getNodes).mockResolvedValue([]);
  vi.mocked(reachabilityApi.parseInput).mockResolvedValue({
    configs: [],
    rejected: [],
    sources: [],
  });
});
afterEach(cleanup);

function renderLauncher(search: string) {
  renderWithProviders(
    <Launcher
      status={undefined}
      link={parseReachabilityDeepLink(new URLSearchParams(search))}
      onModeChange={vi.fn()}
      runningJobId={null}
      onRunning={vi.fn()}
      modes={OTHER_MODES}
    />,
  );
}

describe('Launcher: подстановка из ?q=', () => {
  it('адреса — в поле «Адреса»', () => {
    renderLauncher('kind=ip&q=ya.ru%2C%2077.88.8.8');
    expect((screen.getByRole('textbox', { name: 'Адреса' }) as HTMLTextAreaElement).value).toBe(
      'ya.ru, 77.88.8.8',
    );
  });

  it('ссылка подписки — в поле «Конфиг или подписка»', () => {
    renderLauncher('kind=vless&q=https%3A%2F%2Fsub.example%2Fabc');
    expect(
      (screen.getByRole('textbox', { name: 'Конфиг или подписка' }) as HTMLTextAreaElement).value,
    ).toBe('https://sub.example/abc');
  });

  it('подсеть — в поле «CIDR»', () => {
    renderLauncher('kind=cidr&q=192.0.2.0%2F24');
    expect((screen.getByRole('textbox', { name: 'CIDR' }) as HTMLInputElement).value).toBe(
      '192.0.2.0/24',
    );
  });
});
