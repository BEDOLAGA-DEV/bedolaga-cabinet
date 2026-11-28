// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import htmlSource from '../../index.html?raw';
import introSource from './intro.js?raw';
import { renderIntroHtml } from '../../vite-plugins/introInline';

/**
 * Стартовая заставка (src/intro/intro.js) работает до бандла, поэтому тест гоняет
 * настоящий инлайн-скрипт из собранного index.html в jsdom: canvas подменён
 * заглушкой, кадры прокручиваются вручную через requestAnimationFrame.
 */

const SCRIPT = (() => {
  const html = renderIntroHtml(htmlSource, introSource);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const script = [...doc.querySelectorAll('script:not([src])')]
    .map((s) => s.textContent ?? '')
    .find((s) => s.includes("root.classList.add('bc-intro')"));
  if (!script) throw new Error('в index.html нет инлайн-скрипта заставки');
  return script;
})();

type Posted = { type: string; data: Record<string, unknown> };

let rafQueue: FrameRequestCallback[] = [];
let now = 0;
let posted: Posted[] = [];

function fakeContext(): CanvasRenderingContext2D {
  const target: Record<string | symbol, unknown> = {
    measureText: (s: string) => ({
      width: s.length * 55,
      actualBoundingBoxAscent: s === 'i' ? 72 : 50,
    }),
  };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : () => {}),
    set: (t, k, v) => {
      t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function enterTelegram(): void {
  (window as unknown as Record<string, unknown>).TelegramWebviewProxy = {
    postEvent: (type: string, data: string) => posted.push({ type, data: JSON.parse(data) }),
  };
  history.replaceState(null, '', '/#tgWebAppData=x&tgWebAppVersion=8.0');
}

async function run(): Promise<void> {
  new Function(SCRIPT)();
  // шрифтов в jsdom нет — start() уходит в микрозадачу
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Прокручивает кадры по 16 мс; возвращает, сколько секунд прошло до конца заставки. */
function frames(seconds: number): number {
  const startAt = now;
  while (now - startAt < seconds * 1000 && rafQueue.length) {
    const queue = rafQueue;
    rafQueue = [];
    now += 16;
    for (const cb of queue) cb(now);
  }
  return (now - startAt) / 1000;
}

function overlay(): Element | null {
  return document.getElementById('bc-intro');
}

function renderApp(withNav: boolean): void {
  const app = document.getElementById('root') as HTMLElement;
  app.innerHTML = withNav
    ? '<nav><a href="/" data-intro-nav aria-current="page"><svg></svg>Главная</a><a href="/balance" data-intro-nav>Баланс</a></nav>'
    : '<main>Вход</main>';
  const rect = {
    left: 100,
    top: 700,
    width: 60,
    height: 50,
    right: 160,
    bottom: 750,
    x: 100,
    y: 700,
  };
  for (const el of app.querySelectorAll('[data-intro-nav], svg')) {
    el.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
  }
}

beforeEach(() => {
  rafQueue = [];
  now = 1000;
  posted = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => fakeContext() as never,
  );
  document.body.innerHTML = '<div id="root"></div>';
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-intro');
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, '', '/');
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).TelegramWebviewProxy;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('стартовая заставка', () => {
  it('в Telegram: разворачивает окно, красит шапку под заставку и сразу шлёт web_app_ready', async () => {
    enterTelegram();
    await run();
    const types = posted.map((p) => p.type);
    expect(types.slice(0, 5)).toEqual([
      'web_app_expand',
      'web_app_set_header_color',
      'web_app_set_background_color',
      'web_app_set_bottom_bar_color',
      'web_app_ready',
    ]);
    expect(posted[1].data).toEqual({ color: '#06070c' });
    expect(types.filter((t) => t === 'web_app_ready')).toHaveLength(1);
    expect(overlay()).not.toBeNull();
  });

  it('цвета, которые SDK ставит во время заставки, придерживаются и отдаются в конце', async () => {
    enterTelegram();
    localStorage.setItem('bc-intro-full-seen', '1');
    renderApp(true);
    const order: string[] = [];
    document.addEventListener('intro:done', () => order.push('intro:done'), { once: true });
    await run();
    const proxy = (
      window as unknown as { TelegramWebviewProxy: { postEvent: (t: string, d: string) => void } }
    ).TelegramWebviewProxy;
    // так SDK при mountMiniApp красит шапку и нижнюю панель в цвета Telegram
    proxy.postEvent('web_app_set_header_color', JSON.stringify({ color_key: 'bg_color' }));
    proxy.postEvent('web_app_set_bottom_bar_color', JSON.stringify({ color: '#ffffff' }));
    proxy.postEvent('web_app_request_theme', '""');
    expect(posted.filter((p) => p.data.color_key === 'bg_color')).toHaveLength(0);
    expect(posted.some((p) => p.type === 'web_app_request_theme')).toBe(true);

    const before = posted.length;
    frames(4);
    expect(overlay()).toBeNull();
    const released = posted.slice(before).filter((p) => p.type.startsWith('web_app_set_'));
    expect(released.map((p) => p.data)).toEqual([{ color_key: 'bg_color' }, { color: '#ffffff' }]);
    expect(order).toEqual(['intro:done']);
    // после заставки — снова напрямую
    (
      window as unknown as { TelegramWebviewProxy: { postEvent: (t: string, d: string) => void } }
    ).TelegramWebviewProxy.postEvent(
      'web_app_set_header_color',
      JSON.stringify({ color: '#111111' }),
    );
    expect(posted[posted.length - 1].data).toEqual({ color: '#111111' });
  });

  it('первый запуск — полная, следующие — короткая', async () => {
    enterTelegram();
    await run();
    expect(document.documentElement.getAttribute('data-intro')).toBe('full');
    document.body.innerHTML = '<div id="root"></div>';
    await run();
    expect(document.documentElement.getAttribute('data-intro')).toBe('short');
  });

  it('ждёт отрисовки приложения, садится в пункт, вибрирует и убирает себя', async () => {
    enterTelegram();
    localStorage.setItem('bc-intro-full-seen', '1');
    const done = vi.fn();
    document.addEventListener('intro:done', done);
    await run();

    frames(3); // короткая длится ~2.8 с, но приложения ещё нет — ждём
    expect(overlay()).not.toBeNull();
    expect(done).not.toHaveBeenCalled();

    renderApp(true);
    frames(3);
    expect(overlay()).toBeNull();
    expect(document.getElementById('bc-intro-skip')).toBeNull();
    expect(document.documentElement.classList.contains('bc-intro')).toBe(false);
    expect(done).toHaveBeenCalledTimes(1);

    const haptics = posted.filter((p) => p.type === 'web_app_trigger_haptic_feedback');
    expect(haptics.map((p) => p.data.type)).toEqual(['impact', 'notification']);
    expect(haptics[1].data).toEqual({ type: 'notification', notification_type: 'success' });
    document.removeEventListener('intro:done', done);
  });

  it('короткая: пока бандл грузится, стоит на слове, а данные страницы ждёт уже на поле точек', async () => {
    enterTelegram();
    localStorage.setItem('bc-intro-full-seen', '1');
    await run();
    frames(3); // React ещё ничего не нарисовал — заставка держит слово
    renderApp(true);
    const fromWord = frames(5);
    expect(overlay()).toBeNull();
    expect(fromWord).toBeGreaterThan(1.4); // от слова до конца: уход слова, волна, раскрытие

    document.body.innerHTML = '<div id="root"><div data-page-loader></div></div>';
    await run();
    frames(3); // приложение смонтировано, но грузит данные — ждём на поле точек
    renderApp(true);
    const fromField = frames(5);
    expect(overlay()).toBeNull();
    expect(fromField).toBeLessThan(1.2); // только раскрытие
  });

  it('полная: вибрация на каждом ключевом моменте, в конце — success', async () => {
    enterTelegram();
    renderApp(true);
    await run();
    frames(12);
    expect(overlay()).toBeNull();
    const haptics = posted.filter((p) => p.type === 'web_app_trigger_haptic_feedback');
    expect(haptics).toHaveLength(7);
    expect(haptics[haptics.length - 1].data.notification_type).toBe('success');
  });

  it('приложение так и не отрисовалось — через 8 с заставка всё равно уходит', async () => {
    enterTelegram();
    localStorage.setItem('bc-intro-full-seen', '1');
    await run();
    const took = frames(20);
    expect(overlay()).toBeNull();
    expect(took).toBeGreaterThan(8);
    expect(took).toBeLessThan(12);
  });

  it('пункта навигации нет (вход) — точка просто садится, заставка исчезает', async () => {
    enterTelegram();
    localStorage.setItem('bc-intro-full-seen', '1');
    renderApp(false);
    await run();
    frames(4);
    expect(overlay()).toBeNull();
  });

  it('событие resize без смены размера не пересоздаёт холст (Telegram шлёт их пачкой при старте)', async () => {
    enterTelegram();
    await run();
    const setWidth = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');
    // слушатели от заставок прошлых тестов живы — считаем только холст текущей
    const mine = () =>
      setWidth.mock.contexts.filter((c) => c === document.querySelector('#bc-intro canvas')).length;
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('resize'));
    expect(mine()).toBe(0);
    vi.stubGlobal('innerWidth', 500);
    window.dispatchEvent(new Event('resize'));
    expect(mine()).toBe(1);
  });

  it('пока приложение грузится, заставка рисует не каждый кадр, чтобы не отнимать процессор у загрузки', async () => {
    enterTelegram();
    localStorage.setItem('bc-intro-full-seen', '1');
    const fill = vi.fn();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(
      () =>
        new Proxy(
          { measureText: (s: string) => ({ width: s.length * 55, actualBoundingBoxAscent: 50 }) },
          {
            get: (t: Record<string, unknown>, k: string) =>
              k in t ? t[k] : k === 'fillRect' ? fill : () => {},
            set: () => true,
          },
        ) as unknown as CanvasRenderingContext2D,
    );
    await run();
    frames(2.7); // короткая дошла до точки ожидания; приложения нет
    const before = fill.mock.calls.length;
    const secs = frames(1);
    const drawn = fill.mock.calls.length - before;
    expect(secs).toBeGreaterThan(0.9);
    expect(drawn).toBeGreaterThan(10);
    expect(drawn).toBeLessThan(30); // ~20 из 60 кадров
  });

  it('кнопка «Пропустить» исчезает с началом раскрытия и не закрывает панель, куда садится точка', async () => {
    enterTelegram();
    renderApp(true);
    await run();
    expect(document.getElementById('bc-intro-skip')).not.toBeNull();
    frames(6.5); // полная: раскрытие начинается около 7,2 с
    expect(document.getElementById('bc-intro-skip')).not.toBeNull();
    frames(1.3);
    expect(document.getElementById('bc-intro-skip')).toBeNull();
    expect(overlay()).not.toBeNull(); // сама заставка ещё идёт
  });

  it('с началом раскрытия заставка пропускает касания к приложению (иначе первое нажатие на панель пропадает)', async () => {
    enterTelegram();
    renderApp(true);
    await run();
    frames(3);
    expect((overlay() as HTMLElement).style.pointerEvents).toBe('');
    frames(4.5); // полная: раскрытие начинается около 7,2 с
    expect((overlay() as HTMLElement).style.pointerEvents).toBe('none');
    expect(overlay()).not.toBeNull(); // заставка ещё идёт, но не перехватывает нажатия
  });

  it('«Пропустить» сразу ведёт к раскрытию приложения', async () => {
    enterTelegram();
    renderApp(true);
    await run();
    frames(0.5);
    (document.getElementById('bc-intro-skip') as HTMLButtonElement).click();
    expect(document.getElementById('bc-intro-skip')).toBeNull();
    const took = frames(5);
    expect(overlay()).toBeNull();
    expect(took).toBeLessThan(1.6);
  });

  it('по ссылке со startapp — без заставки', async () => {
    enterTelegram();
    history.replaceState(null, '', '/#tgWebAppData=x&tgWebAppStartParam=renew');
    await run();
    expect(overlay()).toBeNull();
    expect(posted).toHaveLength(0);
  });

  it.each(['/balance/top-up/result', '/auth/telegram/callback', '/buy/success/abc', '/privacy'])(
    'на странице возврата %s — без заставки',
    async (path) => {
      history.replaceState(null, '', path);
      await run();
      expect(overlay()).toBeNull();
    },
  );

  it('при «уменьшении движения» — без заставки', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }));
    await run();
    expect(overlay()).toBeNull();
  });

  it('в браузере — раз за сессию вкладки', async () => {
    await run();
    expect(overlay()).not.toBeNull();
    document.body.innerHTML = '<div id="root"></div>';
    await run();
    expect(overlay()).toBeNull();
  });

  it('без canvas — приложение открывается как обычно', async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => null);
    await run();
    expect(overlay()).toBeNull();
    expect(document.documentElement.classList.contains('bc-intro')).toBe(false);
  });

  it('?intro=short:t:1 — замирает на кадре и даёт двигать его', async () => {
    history.replaceState(null, '', '/?intro=short:t:1');
    await run();
    expect(document.documentElement.getAttribute('data-intro')).toBe('short');
    const seek = (window as unknown as { __introSeek?: (t: number) => void }).__introSeek;
    expect(typeof seek).toBe('function');
    for (let t = 0; t <= 2.4; t += 0.05) expect(() => seek?.(t)).not.toThrow();
  });

  it('все кадры полной заставки рисуются без исключений', async () => {
    history.replaceState(null, '', '/?intro=full:t:0');
    renderApp(true);
    await run();
    const seek = (window as unknown as { __introSeek?: (t: number) => void }).__introSeek;
    for (let t = 0; t <= 8.4; t += 1 / 60) expect(() => seek?.(t)).not.toThrow();
  });

  it('буквы кольца и точки растра рисуются заготовками один раз, а не каждый кадр', async () => {
    history.replaceState(null, '', '/?intro=full:t:0');
    await run();
    const seek = (window as unknown as { __introSeek?: (t: number) => void }).__introSeek;
    const getContext = vi.mocked(HTMLCanvasElement.prototype.getContext);
    const film = () => {
      for (let t = 0; t <= 8.4; t += 1 / 60) seek?.(t);
    };
    const before = getContext.mock.calls.length;
    film();
    const made = getContext.mock.calls.length - before;
    expect(made).toBeGreaterThan(1); // заготовки появились
    expect(made).toBeLessThan(30); // по одной на букву и цвет, а не на кадр
    film();
    expect(getContext.mock.calls.length - before).toBe(made); // второй прогон — ни одной новой
  });
});
