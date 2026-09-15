// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('деньги не обрезаются многоточием — на телефоне «100,0…» прятало цифры', () => {
    render(<StatCard label="Заработано" value="12 345,67 ₽" icon={<svg />} />);
    const value = screen.getByText('12 345,67 ₽');
    expect(value.className).not.toContain('truncate');
  });

  it('узкая плитка отдаёт значению всю ширину: раскладка зависит от ширины плитки, а не экрана', () => {
    const { container } = render(<StatCard label="Заработано" value="1 ₽" icon={<svg />} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.className).toContain('[container:stat-tile/inline-size]');
    // Иконка переезжает к значению только в широкой плитке.
    const icon = container.querySelector('svg')?.parentElement as HTMLElement;
    expect(icon.className).toMatch(/tile-wide:row-start-2/);
  });
});
