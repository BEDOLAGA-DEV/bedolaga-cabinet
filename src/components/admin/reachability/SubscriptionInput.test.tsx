// @vitest-environment jsdom
import type { UseQueryResult } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedInput } from '@/api/reachability';

/** Поле «Конфиг или подписка»: состояние разбора видно рядом — загрузка, источники, пропуски. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { SubscriptionInput } from './SubscriptionInput';

afterEach(cleanup);

const query = (partial: Partial<UseQueryResult<ParsedInput>>) =>
  ({
    data: undefined,
    error: null,
    isFetching: false,
    isError: false,
    ...partial,
  }) as UseQueryResult<ParsedInput>;

describe('SubscriptionInput', () => {
  it('пока подписка грузится — говорит об этом; потом показывает источники и пропуски', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SubscriptionInput value="" onChange={onChange} parsed={query({ isFetching: true })} />,
    );
    expect(screen.getByRole('status').textContent).toBe('Загружаю подписку…');
    fireEvent.change(screen.getByRole('textbox', { name: 'Конфиг или подписка' }), {
      target: { value: 'https://sub.example/x' },
    });
    expect(onChange).toHaveBeenCalledWith('https://sub.example/x');
    rerender(
      <SubscriptionInput
        value="https://sub.example/x"
        onChange={onChange}
        parsed={query({
          data: {
            configs: [],
            rejected: [{ reason: 'stub', preview: '0.0.0.0:1' }],
            sources: [
              { kind: 'subscription', label: 'https://sub.example/x', count: 9 },
              { kind: 'links', label: 'ссылки', count: 1 },
            ],
          },
        })}
      />,
    );
    expect(screen.getByText('подписка · 9')).toBeTruthy();
    expect(screen.getByText('ссылки · 1')).toBeTruthy();
    expect(screen.getByText('Пропущено: 1').getAttribute('title')).toContain('заглушка');
  });
});
