import { type ActivityEvent, activityApi } from '@/api/activity';

/**
 * Сбор следа пользователя: экраны и нажатия копятся в очередь и уходят пачкой.
 *
 * Нажатие ловится одним слушателем на документе (в фазе захвата — сработает,
 * даже если обработчик кнопки остановил всплытие). Подпись берётся с самой
 * кнопки: data-track, aria-label, title, текст. Поля ввода не считаются —
 * клик в поле это не действие, а набор текста в журнал не идёт.
 */

const FLUSH_DELAY_MS = 700;
const BATCH_MAX = 20;
const LABEL_MAX = 80;
/** Повтор того же экрана в этом окне — не новый экран (StrictMode, перерисовки). */
const SCREEN_REPEAT_WINDOW_MS = 1500;

const CLICKABLE_SELECTOR = [
  '[data-track]',
  'button',
  'a',
  'summary',
  'label',
  'select',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="submit"]',
  'input[type="button"]',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="option"]',
  '[role="link"]',
].join(', ');

const TYPING_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]';

let queue: ActivityEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastScreen: { path: string; at: number } | null = null;

/** Экраны админки в след пользователя не попадают: действия админа пишутся в свой журнал. */
export const isTrackablePath = (pathname: string): boolean => !pathname.startsWith('/admin');

const compact = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX);

/** Подпись нажатого элемента; null — нажатие не считается (поле ввода, служебная зона). */
export function resolveClickLabel(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('[data-track-ignore]')) return null;
  if (target.closest(TYPING_SELECTOR)) return null;
  const el = target.closest<HTMLElement>(CLICKABLE_SELECTOR);
  if (!el) return null;

  const explicit = compact(el.getAttribute('data-track'));
  if (explicit) return explicit;
  const aria = compact(el.getAttribute('aria-label'));
  if (aria) return aria;
  const title = compact(el.getAttribute('title'));
  if (title) return title;
  const text = compact(el.textContent);
  if (text) return text;
  const alt = compact(el.querySelector('img[alt]')?.getAttribute('alt'));
  if (alt) return alt;
  const svgTitle = compact(el.querySelector('svg title')?.textContent);
  if (svgTitle) return svgTitle;
  const name = compact(el.getAttribute('name'));
  if (name) return name;
  return `[${el.tagName.toLowerCase()}]`;
}

function flush(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  void activityApi.sendEvents(batch);
}

function enqueue(event: ActivityEvent): void {
  queue = [...queue, event];
  if (queue.length >= BATCH_MAX) {
    flush();
    return;
  }
  if (!timer) timer = setTimeout(flush, FLUSH_DELAY_MS);
}

/** Открытие экрана: повтор того же пути в коротком окне не считается. */
export function trackScreen(pathname: string): void {
  if (!isTrackablePath(pathname)) return;
  const now = Date.now();
  if (lastScreen?.path === pathname && now - lastScreen.at < SCREEN_REPEAT_WINDOW_MS) return;
  lastScreen = { path: pathname, at: now };
  enqueue({ kind: 'screen', path: pathname });
}

/** Нажатие: подпись кнопки + экран, на котором нажали. */
export function trackClick(target: EventTarget | null, pathname: string): void {
  if (!isTrackablePath(pathname)) return;
  const label = resolveClickLabel(target);
  if (!label) return;
  enqueue({ kind: 'click', path: pathname, label });
}

/** Подключить сбор нажатий на документе; возвращает функцию отключения. */
export function installClickTracker(getPathname: () => string): () => void {
  const onClick = (event: MouseEvent) => trackClick(event.target, getPathname());
  const onHide = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('click', onClick, true);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flush);
  return () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', flush);
    flush();
  };
}

/** Для тестов: сбросить очередь и память об экране. */
export function resetActivityTracker(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  queue = [];
  lastScreen = null;
}
