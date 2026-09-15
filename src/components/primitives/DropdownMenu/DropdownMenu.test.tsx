// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu';

// В jsdom нет PointerEvent — без него pointerType теряется и касание не отличить от мыши.
class TestPointerEvent extends MouseEvent {
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerType = init.pointerType ?? 'mouse';
  }
}
Object.assign(window, { PointerEvent: TestPointerEvent });
if (!('ResizeObserver' in window)) {
  Object.assign(window, {
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
}

vi.mock('@/platform', () => ({ usePlatform: () => ({ haptic: { impact: () => {} } }) }));

function Menu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Фильтр</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Пункт</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Ряд чипов листают пальцем: касание, с которого начался свайп, не должно
 * раскрывать меню. Для касания меню открывается по click, для мыши — сразу.
 */
describe('DropdownMenuTrigger', () => {
  afterEach(cleanup);

  it('касание не раскрывает меню само по себе', () => {
    render(<Menu />);
    fireEvent.pointerDown(screen.getByText('Фильтр'), { pointerType: 'touch', button: 0 });
    expect(screen.queryByText('Пункт')).toBeNull();
  });

  it('касание + click раскрывает', () => {
    render(<Menu />);
    const trigger = screen.getByText('Фильтр');
    fireEvent.pointerDown(trigger, { pointerType: 'touch', button: 0 });
    fireEvent.click(trigger);
    expect(screen.getByText('Пункт')).toBeTruthy();
  });

  it('click без указателя (экранный диктор) раскрывает', () => {
    render(<Menu />);
    fireEvent.click(screen.getByText('Фильтр'));
    expect(screen.getByText('Пункт')).toBeTruthy();
  });

  it('мышь раскрывает на нажатии, и следующий click не закрывает', () => {
    render(<Menu />);
    const trigger = screen.getByText('Фильтр');
    fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
    fireEvent.click(trigger);
    expect(screen.getByText('Пункт')).toBeTruthy();
  });
});
