// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TierBadge } from './TierBadge';

/** Тариф виден с первого взгляда: пилюля с ромбом и именем тарифа, цвет по тарифу, без даты. */

afterEach(cleanup);

describe('TierBadge', () => {
  it('показывает тариф заглавными с ромбом и цветом тарифа', () => {
    render(<TierBadge tier="Gold" />);
    const badge = screen.getByText('gold');
    expect(badge.className).toContain('uppercase');
    expect(badge.className).toContain('urgent-400');
    expect(badge.textContent).toBe('◆gold');
  });

  it('незнакомый тариф рисуется нейтрально', () => {
    render(<TierBadge tier="diamond" />);
    expect(screen.getByText('diamond').className).toContain('dark-400');
  });
});
