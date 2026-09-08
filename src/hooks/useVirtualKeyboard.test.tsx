// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { isTextEntry, resetVirtualKeyboard, useVirtualKeyboard } from './useVirtualKeyboard';

/**
 * На телефоне фокус в поле ввода поднимает экранную клавиатуру, и всё, что
 * прижато к низу экрана (панель навигации, плашки запуска и массовых действий),
 * всплывает над ней. Один общий сигнал «клавиатура открыта» — по фокусу в
 * текстовом поле — и все прижатые элементы прячутся по нему одинаково.
 */
const focusIn = (el: Element) => el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
const focusOut = (el: Element, relatedTarget: Element | null) =>
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));

afterEach(() => {
  cleanup();
  resetVirtualKeyboard();
  document.body.innerHTML = '';
});

describe('isTextEntry', () => {
  it('поля ввода и редактируемый текст — да', () => {
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(isTextEntry(document.createElement('input'))).toBe(true);
    expect(isTextEntry(document.createElement('textarea'))).toBe(true);
    expect(isTextEntry(editable)).toBe(true);
  });

  it('кнопки, документ и пустая цель — нет', () => {
    expect(isTextEntry(document.createElement('button'))).toBe(false);
    expect(isTextEntry(document)).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});

describe('useVirtualKeyboard', () => {
  it('открыта, пока фокус в поле ввода; закрыта после ухода фокуса на кнопку', () => {
    const input = document.createElement('input');
    const button = document.createElement('button');
    document.body.append(input, button);
    const { result } = renderHook(() => useVirtualKeyboard());
    expect(result.current).toBe(false);

    act(() => void focusIn(input));
    expect(result.current).toBe(true);

    act(() => void focusOut(input, button));
    expect(result.current).toBe(false);
  });

  it('переход фокуса между полями клавиатуру не закрывает', () => {
    const first = document.createElement('input');
    const second = document.createElement('textarea');
    document.body.append(first, second);
    const { result } = renderHook(() => useVirtualKeyboard());

    act(() => void focusIn(first));
    act(() => void focusOut(first, second));
    expect(result.current).toBe(true);
  });

  it('сброс при смене экрана закрывает клавиатуру, даже если blur не пришёл', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const { result } = renderHook(() => useVirtualKeyboard());

    act(() => void focusIn(input));
    expect(result.current).toBe(true);
    act(() => resetVirtualKeyboard());
    expect(result.current).toBe(false);
  });

  it('несколько подписчиков видят одно состояние', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const a = renderHook(() => useVirtualKeyboard());
    const b = renderHook(() => useVirtualKeyboard());

    act(() => void focusIn(input));
    expect(a.result.current).toBe(true);
    expect(b.result.current).toBe(true);
  });
});
