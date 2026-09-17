// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FortuneWheel from './FortuneWheel';

/**
 * Колесо рисуется одной картинкой: внутри SVG ничего не компонуется отдельно.
 *
 * Android WebView на части устройств (Xiaomi 12, жалоба 17.09.2026) рисует
 * отдельные GPU-слои внутри SVG чёрными плитками поверх соседей: сначала
 * пропадал обод под квадратом вращающейся группы, после переноса обода выше —
 * чёрный прямоугольник поверх секторов. Слои заводили CSS-transform на группе
 * (вращение) и анимация opacity у свечения лампочек. Теперь вращение идёт
 * SVG-атрибутом, который рисуется вместе со всем SVG, свечение — через
 * fill-opacity, а порядок слоёв держится: обод и лампочки после группы,
 * ступица после обода.
 */

const prizes = [
  { id: 1, emoji: '🎁', color: '#22C55E' },
  { id: 2, emoji: '📅', color: '#F59E0B' },
  { id: 3, emoji: '💩', color: '#8B5A2B' },
] as never;
const rest = { prizes, isSpinning: false, targetRotation: null, onSpinComplete: () => {} };
const ROTATING = 'svg > g[transform^="rotate("]';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function follows(later: Element, earlier: Element): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function pick(container: HTMLElement, selector: string): Element {
  const node = container.querySelector(selector);
  if (!node) throw new Error(`в разметке колеса нет ${selector}`);
  return node;
}

describe('FortuneWheel — порядок слоёв', () => {
  it('обод и лампочки идут после вращающейся группы, ступица — после обода', () => {
    const { container } = render(<FortuneWheel {...rest} />);
    const rotating = pick(container, ROTATING);
    const ring = pick(container, 'circle[stroke="url(#ringGrad)"]');
    const led = pick(container, '.led-dot');
    const hub = pick(container, 'circle[fill="url(#hubGrad)"]');

    expect(follows(ring, rotating)).toBe(true);
    expect(follows(led, rotating)).toBe(true);
    expect(follows(hub, ring)).toBe(true);
    expect(follows(hub, led)).toBe(true);
  });
});

describe('FortuneWheel — ничего не компонуется отдельно', () => {
  it('внутри SVG нет CSS-transform: вращение задано атрибутом', () => {
    const { container } = render(<FortuneWheel {...rest} />);
    expect(container.querySelectorAll('svg [style*="transform"]').length).toBe(0);
    expect(pick(container, ROTATING).getAttribute('transform')).toBe('rotate(0 200 200)');
  });

  it('свечение лампочек анимирует fill-opacity, а не opacity', () => {
    const { container } = render(<FortuneWheel {...rest} />);
    const css = container.querySelector('svg style')?.textContent ?? '';
    expect(css).toMatch(/\.led-glow\s*{[^}]*fill-opacity/);
    expect(css).not.toMatch(/(?<![a-z-])opacity\s*:/);
  });

  it('спин крутит группу атрибутом пять секунд и потом сообщает о завершении', () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    const onSpinComplete = vi.fn();
    const { container, rerender } = render(
      <FortuneWheel {...rest} onSpinComplete={onSpinComplete} />,
    );
    rerender(
      <FortuneWheel {...rest} isSpinning targetRotation={90} onSpinComplete={onSpinComplete} />,
    );

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(pick(container, ROTATING).getAttribute('transform')).not.toBe('rotate(0 200 200)');
    expect(onSpinComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onSpinComplete).toHaveBeenCalledTimes(1);
    // Пять полных оборотов плюс сектор: 1800 + 90.
    expect(pick(container, ROTATING).getAttribute('transform')).toBe('rotate(1890 200 200)');
  });
});
