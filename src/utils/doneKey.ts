/**
 * Клавиша «Готово» на экранной клавиатуре.
 *
 * У экранной клавиатуры на телефоне нет своей кнопки «скрыть», а в Mini App
 * Telegram нет и родной панели iOS с «Готово» над клавиатурой — её показывает
 * не страница, а WebView. Поэтому на всех однострочных полях клавиша ввода
 * подписывается «Готово» (enterkeyhint) и закрывает клавиатуру: поле теряет
 * фокус, а платформа получает шанс спрятать клавиатуру сама (Telegram —
 * hideKeyboard(), Bot API 9.1+). Многострочные поля не трогаем: там Enter
 * переносит строку. Поле, которое само обработало Enter (preventDefault —
 * «добавить ещё один», «отправить»), клавиатуру не теряет.
 */
export const DONE_HINT = 'done';

/** Устройства без указателя-мыши: только там есть экранная клавиатура. */
export const TOUCH_ONLY_QUERY = '(hover: none) and (pointer: coarse)';

const NON_TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  'button',
  'submit',
  'reset',
  'checkbox',
  'radio',
  'file',
  'range',
  'color',
  'hidden',
  'image',
]);

export function isSingleLineTextEntry(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(target.type);
}

function stamp(input: HTMLInputElement): void {
  if (!isSingleLineTextEntry(input) || input.hasAttribute('enterkeyhint')) return;
  input.setAttribute('enterkeyhint', DONE_HINT);
}

/** Подписать «Готово» полям внутри узла (или самому полю), у которых нет своей подсказки. */
export function stampEnterKeyHint(root: Node): void {
  if (root instanceof HTMLInputElement) {
    stamp(root);
    return;
  }
  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    root.querySelectorAll('input').forEach(stamp);
  }
}

export function shouldDismissOnEnter(event: KeyboardEvent): boolean {
  return (
    event.key === 'Enter' &&
    !event.isComposing &&
    !event.defaultPrevented &&
    isSingleLineTextEntry(event.target)
  );
}

type MatchMedia = (query: string) => { matches: boolean };

export function isTouchOnly(matchMedia: MatchMedia | undefined): boolean {
  return matchMedia?.(TOUCH_ONLY_QUERY).matches ?? false;
}

export interface DoneKeyOptions {
  /** Спрятать клавиатуру средствами платформы; в браузере достаточно потери фокуса. */
  hideKeyboard: () => void;
  root?: Document;
}

/**
 * Включить «Готово» на всей странице: подписать уже существующие поля, следить
 * за новыми и закрывать клавиатуру по Enter. Возвращает функцию отключения.
 */
export function installDoneKey({ hideKeyboard, root = document }: DoneKeyOptions): () => void {
  stampEnterKeyHint(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach(stampEnterKeyHint);
    }
  });
  observer.observe(root.documentElement, { childList: true, subtree: true });

  const onKeyDown = (event: KeyboardEvent): void => {
    const field = event.target;
    if (!isSingleLineTextEntry(field) || !shouldDismissOnEnter(event)) return;
    field.blur();
    hideKeyboard();
  };
  root.addEventListener('keydown', onKeyDown);

  return () => {
    observer.disconnect();
    root.removeEventListener('keydown', onKeyDown);
  };
}
