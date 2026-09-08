// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installDoneKey, isSingleLineTextEntry, isTouchOnly, stampEnterKeyHint } from './doneKey';

/**
 * На телефоне у экранной клавиатуры нет своей кнопки «скрыть» (в Mini App
 * Telegram нет и родной панели iOS с «Готово»). Поэтому клавиша ввода на всех
 * однострочных полях подписывается «Готово» и закрывает клавиатуру: поле теряет
 * фокус, а в Telegram дополнительно вызывается hideKeyboard(). Многострочные
 * поля не трогаем — там Enter переносит строку.
 */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const pressEnter = (el: Element, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init }),
  );

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isSingleLineTextEntry', () => {
  it('текстовые input — да, textarea и кнопки-инпуты — нет', () => {
    const text = document.createElement('input');
    const search = document.createElement('input');
    search.type = 'search';
    const number = document.createElement('input');
    number.type = 'number';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const submit = document.createElement('input');
    submit.type = 'submit';
    expect(isSingleLineTextEntry(text)).toBe(true);
    expect(isSingleLineTextEntry(search)).toBe(true);
    expect(isSingleLineTextEntry(number)).toBe(true);
    expect(isSingleLineTextEntry(checkbox)).toBe(false);
    expect(isSingleLineTextEntry(submit)).toBe(false);
    expect(isSingleLineTextEntry(document.createElement('textarea'))).toBe(false);
    expect(isSingleLineTextEntry(null)).toBe(false);
  });
});

describe('stampEnterKeyHint', () => {
  it('ставит «Готово» текстовым полям без своей подсказки, чужую подсказку не трогает', () => {
    document.body.innerHTML = `
      <input id="plain" />
      <input id="own" enterkeyhint="go" />
      <input id="check" type="checkbox" />
      <textarea id="multi"></textarea>
      <div><input id="nested" type="search" /></div>`;
    stampEnterKeyHint(document.body);
    expect(document.getElementById('plain')?.getAttribute('enterkeyhint')).toBe('done');
    expect(document.getElementById('nested')?.getAttribute('enterkeyhint')).toBe('done');
    expect(document.getElementById('own')?.getAttribute('enterkeyhint')).toBe('go');
    expect(document.getElementById('check')?.hasAttribute('enterkeyhint')).toBe(false);
    expect(document.getElementById('multi')?.hasAttribute('enterkeyhint')).toBe(false);
  });

  it('принимает и сам input, а не только контейнер', () => {
    const input = document.createElement('input');
    stampEnterKeyHint(input);
    expect(input.getAttribute('enterkeyhint')).toBe('done');
  });
});

describe('installDoneKey', () => {
  it('поле, появившееся позже, тоже получает «Готово»', async () => {
    const stop = installDoneKey({ hideKeyboard: vi.fn() });
    const input = document.createElement('input');
    document.body.append(input);
    await tick();
    expect(input.getAttribute('enterkeyhint')).toBe('done');
    stop();
  });

  it('Enter в однострочном поле снимает фокус и прячет клавиатуру Telegram', () => {
    const hideKeyboard = vi.fn();
    const stop = installDoneKey({ hideKeyboard });
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    pressEnter(input);
    expect(document.activeElement).not.toBe(input);
    expect(hideKeyboard).toHaveBeenCalledTimes(1);
    stop();
  });

  it('Enter, который уже обработало поле (preventDefault), клавиатуру не закрывает', () => {
    const hideKeyboard = vi.fn();
    const stop = installDoneKey({ hideKeyboard });
    const input = document.createElement('input');
    input.addEventListener('keydown', (event) => event.preventDefault());
    document.body.append(input);
    input.focus();

    pressEnter(input);
    expect(document.activeElement).toBe(input);
    expect(hideKeyboard).not.toHaveBeenCalled();
    stop();
  });

  it('Enter в textarea и во время набора через IME ничего не делает', () => {
    const hideKeyboard = vi.fn();
    const stop = installDoneKey({ hideKeyboard });
    const area = document.createElement('textarea');
    const input = document.createElement('input');
    document.body.append(area, input);

    area.focus();
    pressEnter(area);
    expect(document.activeElement).toBe(area);

    input.focus();
    pressEnter(input, { isComposing: true });
    expect(document.activeElement).toBe(input);
    expect(hideKeyboard).not.toHaveBeenCalled();
    stop();
  });

  it('другие клавиши фокус не снимают', () => {
    const hideKeyboard = vi.fn();
    const stop = installDoneKey({ hideKeyboard });
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(document.activeElement).toBe(input);
    expect(hideKeyboard).not.toHaveBeenCalled();
    stop();
  });

  it('после остановки больше не вмешивается', () => {
    const hideKeyboard = vi.fn();
    const stop = installDoneKey({ hideKeyboard });
    stop();
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    pressEnter(input);
    expect(document.activeElement).toBe(input);
    expect(hideKeyboard).not.toHaveBeenCalled();
  });
});

describe('isTouchOnly', () => {
  it('телефон и планшет — да, ноутбук с мышью — нет, без matchMedia — нет', () => {
    const phone = (query: string) => ({ matches: query === '(hover: none) and (pointer: coarse)' });
    const laptop = () => ({ matches: false });
    expect(isTouchOnly(phone)).toBe(true);
    expect(isTouchOnly(laptop)).toBe(false);
    expect(isTouchOnly(undefined)).toBe(false);
  });
});
