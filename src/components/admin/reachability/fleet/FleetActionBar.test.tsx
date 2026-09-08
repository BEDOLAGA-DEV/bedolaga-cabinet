// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resetVirtualKeyboard } from '@/hooks/useVirtualKeyboard';
import { FleetActionBar } from './FleetActionBar';

/**
 * Плашка прижата к низу экрана. Когда открыта экранная клавиатура (фокус в поле
 * поиска по серверам), она всплывала над клавиатурой и закрывала список —
 * теперь прячется, как нижняя панель навигации, и возвращается после ухода фокуса.
 */
afterEach(() => {
  cleanup();
  resetVirtualKeyboard();
});

describe('FleetActionBar', () => {
  it('прячется при открытой клавиатуре и возвращается после', () => {
    const { container, getByText } = render(
      <div>
        <input aria-label="search" />
        <FleetActionBar title="1 887 cred" action={<button type="button">Go</button>} />
      </div>,
    );
    const input = container.querySelector('input') as HTMLInputElement;
    const bar = getByText('1 887 cred').closest('.fixed') as HTMLElement;
    expect(bar.className).not.toContain('opacity-0');

    act(() => void input.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));
    expect(bar.className).toContain('opacity-0');
    expect(bar.className).toContain('pointer-events-none');

    act(() => void input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(bar.className).not.toContain('opacity-0');
  });
});
