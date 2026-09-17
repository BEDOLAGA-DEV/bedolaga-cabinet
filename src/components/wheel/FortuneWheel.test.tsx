// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FortuneWheel from './FortuneWheel';

/**
 * Порядок слоёв колеса.
 *
 * Обод и лампочки не пересекаются с секторами, поэтому визуально порядок
 * безразличен. Но вращающаяся группа несёт CSS-transform, и Android WebView на
 * части устройств (Xiaomi 12, жалоба 17.09.2026) выносит её в отдельный слой,
 * прозрачные пиксели которого «пробивают» всё под ним до подложки Telegram —
 * обод исчезал везде, где его накрывал квадрат группы. Обод обязан рисоваться
 * после группы, а ступица — после обода.
 */

const prizes = [
  { id: 1, emoji: '🎁', color: '#22C55E' },
  { id: 2, emoji: '📅', color: '#F59E0B' },
  { id: 3, emoji: '💩', color: '#8B5A2B' },
] as never;

afterEach(cleanup);

function follows(later: Element, earlier: Element): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('FortuneWheel — порядок слоёв', () => {
  it('обод и лампочки идут после вращающейся группы, ступица — после обода', () => {
    const { container } = render(
      <FortuneWheel
        prizes={prizes}
        isSpinning={false}
        targetRotation={null}
        onSpinComplete={() => {}}
      />,
    );
    const pick = (selector: string): Element => {
      const node = container.querySelector(selector);
      if (!node) throw new Error(`в разметке колеса нет ${selector}`);
      return node;
    };
    const rotating = pick('svg > g[style*="rotate"]');
    const ring = pick('circle[stroke="url(#ringGrad)"]');
    const led = pick('.led-dot');
    const hub = pick('circle[fill="url(#hubGrad)"]');

    expect(follows(ring, rotating)).toBe(true);
    expect(follows(led, rotating)).toBe(true);
    expect(follows(hub, ring)).toBe(true);
    expect(follows(hub, led)).toBe(true);
  });
});
