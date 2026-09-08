// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from './useCountdown';

/**
 * Счётчик для кнопок повторной отправки.
 *
 * Считает по сроку окончания, а не по тикам: в фоновой вкладке браузер душит
 * setInterval, и счётчик «на тиках» после возвращения оставил бы кнопку
 * заблокированной дольше обещанного.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCountdown', () => {
  it('начинает с заданного числа и досчитывает до нуля', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current[0]).toBe(2);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current[0]).toBe(0);
  });

  it('не застревает, если вкладка была свёрнута и тики не приходили', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current[1](60));
    // Один тик за всю минуту — именно так ведёт себя фоновая вкладка.
    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    expect(result.current[0]).toBe(0);
  });

  it('перезапуск начинает отсчёт заново', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current[1](5));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current[0]).toBe(2);

    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
  });

  it('ноль и мусор не запускают отсчёт', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current[1](0));
    expect(result.current[0]).toBe(0);

    act(() => result.current[1](Number.NaN));
    expect(result.current[0]).toBe(0);
  });
});
