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

  it('поиск сужает список, а «Все» отмечает только найденные', () => {
    const many: SubscriptionConfig[] = Array.from({ length: 60 }, (_, i) => ({
      index: i,
      protocol: 'vless',
      label: i % 3 === 0 ? `DE-${i}` : `NL-${i}`,
      address: `srv${i}.example`,
      port: 443,
      sni: null,
      target_key: `srv${i}.example:443`,
      purpose: 'regular',
    }));
    const onSelectMany = vi.fn();
    render(
      <SubscriptionConfigs
        configs={many}
        rejected={[]}
        selected={[]}
        onToggle={vi.fn()}
        onSelectMany={onSelectMany}
        onClear={vi.fn()}
      />,
    );
    const filter = screen.getByRole('searchbox', { name: 'Найти по названию или адресу' });
    fireEvent.change(filter, { target: { value: 'de-' } });
    expect(screen.getByText('показано 20 из 60')).toBeTruthy();
    expect(screen.queryByText('NL-1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Все' }));
    expect(onSelectMany).toHaveBeenCalledWith(
      many.filter((c) => c.label.startsWith('DE')).map((c) => c.index),
    );
    fireEvent.change(filter, { target: { value: 'srv59' } });
    expect(screen.getByText('NL-59')).toBeTruthy();
    fireEvent.change(filter, { target: { value: 'нет такого' } });
    expect(screen.getByText('Ничего не найдено')).toBeTruthy();
  });

  it('десять тысяч серверов отрисовываются и не ломают счётчик', () => {
    const huge: SubscriptionConfig[] = Array.from({ length: 10_000 }, (_, i) => ({
      index: i,
      protocol: 'vless',
      label: `S-${i}`,
      address: `srv${i}.example`,
      port: 443,
      sni: null,
      target_key: `srv${i}.example:443`,
      purpose: 'regular',
    }));
    const started = performance.now();
    const { container } = render(
      <SubscriptionConfigs
        configs={huge}
        rejected={[]}
        selected={[3]}
        onToggle={vi.fn()}
        onSelectMany={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const elapsed = performance.now() - started;
    expect(screen.getByText('выбрано 1 / 10000')).toBeTruthy();
    expect(container.querySelectorAll('li')).toHaveLength(10_000);
    expect(elapsed).toBeLessThan(5_000);
  });

  it('предупреждение панели о подписке по умолчанию показывается над списком', () => {
    render(
      <SubscriptionConfigs
        configs={configs}
        rejected={[]}
        selected={[]}
        note="Подписка отключена в панели"
        onToggle={vi.fn()}
        onSelectMany={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('Подписка отключена в панели')).toBeTruthy();
  });
});
