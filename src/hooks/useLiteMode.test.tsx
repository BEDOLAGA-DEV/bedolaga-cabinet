// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { brandingApi } from '@/api/branding';
import { STORAGE_KEYS } from '@/config/constants';
import { safeLocal } from '@/utils/safeStorage';

import { readLiteModeHint, useLiteMode, writeLiteModeHint } from './useLiteMode';

/**
 * Простой вид решает, какой экран увидит покупатель на «/». Ответ сервера
 * приходит уже после первой отрисовки, поэтому подсказка прошлого визита —
 * не оптимизация, а защита от того, что человек увидит полный экран и он
 * на его глазах сменится простым.
 */

function Probe() {
  const { lite, isLoading } = useLiteMode();
  return (
    <span data-testid="probe">
      {lite ? 'lite' : 'full'}/{isLoading ? 'loading' : 'ready'}
    </span>
  );
}

function renderProbe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
}

describe('подсказка простого вида', () => {
  beforeEach(() => {
    safeLocal.removeItem(STORAGE_KEYS.LITE_MODE);
  });

  it('без сохранённого значения считает вид полным', () => {
    expect(readLiteModeHint()).toBe(false);
  });

  it('переживает запись и чтение', () => {
    writeLiteModeHint(true);
    expect(readLiteModeHint()).toBe(true);

    writeLiteModeHint(false);
    expect(readLiteModeHint()).toBe(false);
  });

  it('на мусоре в хранилище не включает простой вид', () => {
    safeLocal.setItem(STORAGE_KEYS.LITE_MODE, 'yes');
    expect(readLiteModeHint()).toBe(false);
  });
});

describe('useLiteMode', () => {
  beforeEach(() => {
    safeLocal.removeItem(STORAGE_KEYS.LITE_MODE);
  });

  afterEach(() => {
    // vitest здесь без globals, поэтому авто-очистка RTL не подключается и
    // разметка предыдущего теста осталась бы в документе.
    cleanup();
    vi.restoreAllMocks();
  });

  it('до ответа сервера отдаёт подсказку прошлого визита, без промежуточного полного экрана', async () => {
    writeLiteModeHint(true);
    let resolve: ((value: { enabled: boolean }) => void) | undefined;
    vi.spyOn(brandingApi, 'getLiteModeEnabled').mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    renderProbe();

    expect(screen.getByTestId('probe').textContent).toBe('lite/loading');

    resolve?.({ enabled: true });
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('lite/ready'));
  });

  it('ответ сервера перебивает подсказку и переписывает её', async () => {
    writeLiteModeHint(true);
    vi.spyOn(brandingApi, 'getLiteModeEnabled').mockResolvedValue({ enabled: false });

    renderProbe();

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('full/ready'));
    expect(readLiteModeHint()).toBe(false);
  });

  it('недоступная настройка оставляет полный вид', async () => {
    vi.spyOn(brandingApi, 'getLiteModeEnabled').mockRejectedValue(new Error('offline'));

    renderProbe();

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('full/ready'));
  });
});
