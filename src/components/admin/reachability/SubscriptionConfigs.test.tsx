// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionConfigs as Data } from '@/api/reachability';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { SubscriptionConfigs } from './SubscriptionConfigs';

const data: Data = {
  short_uuid: 'ref',
  configs: [
    {
      index: 0,
      protocol: 'vless',
      label: 'RU-BS',
      address: 'bs.example',
      port: 443,
      sni: 'white.example',
      target_key: 'bs.example:443',
      purpose: 'bs',
    },
    {
      index: 1,
      protocol: 'vless',
      label: 'DE',
      address: 'de.example',
      port: 443,
      sni: null,
      target_key: 'de.example:443',
      purpose: 'regular',
    },
  ],
  rejected: [],
};

afterEach(cleanup);

describe('SubscriptionConfigs', () => {
  it('быстрый выбор отмечает конфиги под Белый список, не трогая уже отмеченные', () => {
    const onToggle = vi.fn();
    render(
      <SubscriptionConfigs
        data={data}
        isLoading={false}
        error={null}
        selected={[]}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /отметить конфиги под БС \(1\)/ }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(0);
  });
});
