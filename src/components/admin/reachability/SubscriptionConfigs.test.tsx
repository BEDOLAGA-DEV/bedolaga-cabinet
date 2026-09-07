// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionConfig } from '@/api/reachability';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { SubscriptionConfigs } from './SubscriptionConfigs';

const configs: SubscriptionConfig[] = [
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
];

afterEach(cleanup);

describe('SubscriptionConfigs', () => {
  it('быстрый выбор отмечает конфиги под Белый список, не трогая уже отмеченные', () => {
    const onSelectMany = vi.fn();
    render(
      <SubscriptionConfigs
        configs={configs}
        rejected={[]}
        selected={[]}
        onToggle={vi.fn()}
        onSelectMany={onSelectMany}
        onClear={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Под Белый список \(1\)/ }));
    expect(onSelectMany).toHaveBeenCalledWith([0]);
  });

  it('повтор адреса и порта помечается как тот же сервер', () => {
    render(
      <SubscriptionConfigs
        configs={[...configs, { ...configs[1], index: 2, label: 'АВТО · proxy-2' }]}
        rejected={[]}
        selected={[]}
        onToggle={vi.fn()}
        onSelectMany={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getAllByText('тот же сервер')).toHaveLength(1);
  });

  it('«Все» отмечает остальные, «Сбросить» снимает всё', () => {
    const onSelectMany = vi.fn();
    const onClear = vi.fn();
    render(
      <SubscriptionConfigs
        configs={configs}
        rejected={[]}
        selected={[0]}
        onToggle={vi.fn()}
        onSelectMany={onSelectMany}
        onClear={onClear}
      />,
    );
    expect(screen.getByText('выбрано 1 / 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Все' }));
    expect(onSelectMany).toHaveBeenCalledWith([1]);
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(onClear).toHaveBeenCalled();
  });
});
