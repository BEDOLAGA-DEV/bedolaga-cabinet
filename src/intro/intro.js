/*
 * Стартовая заставка berlinconnection.
 *
 * Встраивается в index.html инлайном (vite-plugins/introInline.ts) и работает до
 * бандла: первый кадр рисуется сразу, пока грузится React. В Telegram штатный
 * экран загрузки настроен в @BotFather как «точка на #06070c»; цвет иконки Telegram
 * выбирает сам (еле заметный серый, #121318). Оба режима начинаются ровно с такой
 * точки и за полсекунды «зажигают» её оранжевой; сразу после первого кадра уходит
 * web_app_ready, так что экран Telegram незаметно перетекает в заставку.
 *
 * Режимы: полный (~8 с) — при первом запуске, короткий (~2.8 с) — дальше.
 * Перед раскрытием сайта заставка ждёт, пока приложение отрисуется (нет
 * [data-page-loader]); короткая, пока не смонтировался React, держит на экране
 * слово berlinconnection. В конце точка садится в активный пункт навигации
 * ([data-intro-nav][aria-current="page"]: нижняя панель на телефоне, верхняя на
 * десктопе), а где навигации нет (вход) — в [data-intro-home], например логотип.
 * Ни того ни другого — точка просто садится и гаснет. В любом исходе заставка
 * удаляет себя со страницы целиком.
 *
 * Каждый кадр — чистая функция времени seek(t); пружины в замкнутой форме.
 * Состояние есть только у управляющего цикла: накопленное время с паузой на
 * ожидание приложения, пропуск, вибрация на пересечении отметок.
 *
 * Отладка: ?intro=full | ?intro=short — показать принудительно;
 * ?intro=full:t:3.2 — замереть на кадре (window.__introSeek(t) двигает кадр).
 */
(() => {
  const root = document.documentElement;
  const q = location.search;
  const hash = location.hash;
  const debug = /[?&]intro=(full|short)(?::t:([\d.]+))?/.exec(q);
  const inTg = !!window.TelegramWebviewProxy || /tgWebApp/.test(hash) || /tgWebApp/.test(q);

  // Страницы возврата (оплата, вход, подтверждения) и юр. тексты — без заставки:
  // человек пришёл не «открыть приложение», а закончить действие.
  const SKIP_PATH =
    /^\/(auth|tg|connect|add|verify-email|reset-password|merge|buy|coupon|auto-login|offer|privacy|recurrent-payments)(\/|$)|\/result(\/|$)/;

  function store(kind) {
    try {
      return window[kind] || null;
    } catch (_e) {
      return null;
    }
  }
  const ls = store('localStorage');
  const ss = store('sessionStorage');

  if (!debug) {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (_e) {}
    // Ссылка со startapp («Продлить», тикеты) ведёт на конкретный экран — не задерживаем.
    if (/tgWebAppStartParam=/.test(hash + q) || /[?&]startapp=/.test(q)) return;
    if (SKIP_PATH.test(location.pathname)) return;
    // В браузере — раз за сессию вкладки: обновление страницы не показывает её снова.
    if (!inTg) {
      if (ss?.getItem('bc-intro-session')) return;
      try {
        ss.setItem('bc-intro-session', '1');
      } catch (_e) {}
    }
  }

  const MODE = debug ? debug[1] : ls?.getItem('bc-intro-full-seen') ? 'short' : 'full';
  const frozenAt = debug?.[2] ? parseFloat(debug[2]) : null;
  if (!debug) {
    try {
      ls.setItem('bc-intro-full-seen', '1');
    } catch (_e) {}
  }

  /* ── язык: выбор в кабинете → язык Telegram → браузер ── */
  let lang = '';
  try {
    lang = ls?.getItem('cabinet_language') || '';
  } catch (_e) {}
  if (!lang) {
    const lc = /"language_code"\s*:\s*"([a-zA-Z-]+)"/.exec(safeDecode(hash));
    lang = lc ? lc[1] : navigator.language || 'ru';
  }
  const RU = /^(ru|uk|be|kk)/i.test(lang);
  const TXT = RU
    ? { label: 'Подключиться', unit: 'Мбит/с', skip: 'Пропустить', router: 'Роутер' }
    : { label: 'Connect', unit: 'Mbps', skip: 'Skip', router: 'Router' };

  function safeDecode(s) {
    try {
      return decodeURIComponent(s);
    } catch (_e) {
      return s;
    }
  }

  /* ── Telegram: события напрямую, SDK ещё не загружен ── */
  function tgPost(type, data) {
    const payload = data || {};
    try {
      if (window.TelegramWebviewProxy) {
        window.TelegramWebviewProxy.postEvent(type, JSON.stringify(payload));
      } else if (window.external && 'notify' in window.external) {
        window.external.notify(JSON.stringify({ eventType: type, eventData: payload }));
      } else if (window.parent !== window) {
        window.parent.postMessage(JSON.stringify({ eventType: type, eventData: payload }), '*');
      }
    } catch (_e) {}
  }
  function haptic(kind, impact) {
    if (inTg) {
      if (kind === 'selection')
        tgPost('web_app_trigger_haptic_feedback', { type: 'selection_change' });
      else if (kind === 'success')
        tgPost('web_app_trigger_haptic_feedback', {
          type: 'notification',
          notification_type: 'success',
        });
      else
        tgPost('web_app_trigger_haptic_feedback', {
          type: 'impact',
          impact_style: impact || 'light',
        });
      return;
    }
    // В браузере вибрация есть только на Android и только после касания страницы;
    // без касания Chrome блокирует вызов и пишет ошибку в консоль — не зовём зря.
    try {
      if (navigator.vibrate && navigator.userActivation?.hasBeenActive)
        navigator.vibrate(kind === 'success' ? [12, 60, 18] : impact === 'heavy' ? 22 : 10);
    } catch (_e) {}
  }

  /* ── разметка поверх страницы ── */
  const BG = '#06070c';
  const SPLASH_DOT = '#121318'; // так Telegram рисует иконку экрана загрузки на фоне #06070c
  const OR = '#FF8A00';
  const TX = '#F4F5FA';
  const FONT = '"Space Grotesk","Manrope",sans-serif';

  const cv = document.createElement('canvas');
  const ctx = cv.getContext?.('2d');
  if (!ctx) return; // нет canvas — приложение откроется как обычно

  const style = document.createElement('style');
  style.textContent =
    'html.bc-intro{overflow:hidden}' +
    '#bc-intro{position:fixed;inset:0;z-index:2147483000;background:' +
    BG +
    ';touch-action:none;cursor:pointer}' +
    '#bc-intro canvas{display:block}' +
    '#bc-intro-skip{position:fixed;z-index:2147483001;right:max(16px,env(safe-area-inset-right,0px));' +
    'bottom:calc(max(16px,env(safe-area-inset-bottom,0px)) + var(--tg-content-safe-area-inset-bottom,0px));' +
    'font:600 13px/1 Manrope,system-ui,sans-serif;color:#A4AAC0;background:rgba(255,255,255,.06);' +
    'border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:10px 16px;cursor:pointer;' +
    '-webkit-tap-highlight-color:transparent}';
  document.head.appendChild(style);

  // Space Grotesk только для глифов заставки (text=…): несколько килобайт вместо всего начертания.
  const gf = document.createElement('link');
  gf.rel = 'stylesheet';
  gf.href =
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap&text=' +
    encodeURIComponent('berlinconnectionıiPhoneAndroidWindowsMacTVRouterConnectMbps0123456789·/ ');
  document.head.appendChild(gf);

  root.classList.add('bc-intro');
  root.setAttribute('data-intro', MODE); // режим заставки — для отладки и тестов
  const wrap = document.createElement('div');
  wrap.id = 'bc-intro';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.appendChild(cv);
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.id = 'bc-intro-skip';
  skip.textContent = TXT.skip;
  document.body.appendChild(wrap);
  document.body.appendChild(skip);

  // Цвета клиента Telegram на время заставки — её тёмные. SDK при запуске сам
  // ставит шапке и нижней панели цвета темы Telegram, и над чёрной заставкой
  // встала бы светлая полоса. Поэтому на время заставки команды смены цветов
  // придерживаем (запоминаем последнюю каждого вида), а в конце отдаём: следом
  // ThemeColorsProvider по intro:done ставит цвета темы кабинета.
  const COLOR_EVENTS = {
    web_app_set_header_color: 1,
    web_app_set_background_color: 1,
    web_app_set_bottom_bar_color: 1,
  };
  const heldColors = {};
  let done = false; // заставка закончилась — дальше всё идёт в Telegram напрямую
  let realProxy = null;
  if (inTg) {
    tgPost('web_app_expand');
    for (const type in COLOR_EVENTS) tgPost(type, { color: BG });
    const proxy = window.TelegramWebviewProxy;
    if (proxy && typeof proxy.postEvent === 'function') {
      try {
        window.TelegramWebviewProxy = {
          postEvent(type, data) {
            if (!done && COLOR_EVENTS[type]) heldColors[type] = data;
            else proxy.postEvent(type, data);
          },
        };
        if (window.TelegramWebviewProxy !== proxy) realProxy = proxy;
      } catch (_e) {}
    }
  }
  function releaseColors() {
    if (!realProxy) return;
    try {
      window.TelegramWebviewProxy = realProxy;
    } catch (_e) {}
    for (const type in heldColors) {
      try {
        realProxy.postEvent(type, heldColors[type]);
      } catch (_e) {}
    }
  }

  /* ── раскадровка ── */
  const WORD = 'berlinconnection';
  const BRAND_AT = 6; // с этой буквы — «connection», в цвет точки
  const TITTLE_AT = 4; // «i» в berl|i|nconnection
  const ORBIT = `iPhone · Android · Windows · Mac · TV · ${TXT.router} · `;
  const LABEL = TXT.label;
  // буквы подписи, которые не исчезают, а переезжают в слово (о → o, с → c / o → o, n → n)
  const CARRY = RU ? { 1: 7, 10: 11 } : { 1: 7, 2: 8 };
  const CARRIED = {};
  for (const ci in CARRY) CARRIED[CARRY[ci]] = true;

  const G_DUR = 0.95; // сколько растёт график скорости
  const T =
    MODE === 'full'
      ? {
          pre: [0.35, 0.75],
          labIn: 0.45,
          cursor: [0.5, 0.95, 1.27, 1.7],
          click: 1.05,
          trackOut: [1.3, 1.53],
          labOut: 1.19,
          carry: 1.25,
          wordIn: 1.45,
          knobFly: 1.37,
          jump: [2.8, 3.05],
          wordOut: 2.8, // слово целиком стоит ~0,9 с: это название сервиса
          axis: [2.9, 3.15],
          target: [2.97, 3.23],
          graph: 3.05,
          graphOut: [4.05, 4.31],
          shoot: [4.07, 4.33],
          grow: [4.33, 4.67],
          hole: 4.55,
          pill: 5.05,
          fill: [5.35, 5.67],
          orbit: 5.63,
          orbitOut: 6.93,
          wave: [7.03, 7.5],
          flip: [7.4, 8.0],
          home: [7.67, 8.21],
          end: 8.37,
          outStagger: 0.012,
          outDur: 0.26,
        }
      : {
          wordIn: 0.12,
          rise: 0.15,
          wordOut: 1.25,
          jump: [1.25, 1.5],
          wave: [1.54, 1.94],
          flip: [1.88, 2.38],
          home: [2.13, 2.63],
          end: 2.77,
          outStagger: 0.006,
          outDur: 0.2,
        };
  // Здесь ждём, пока приложение отрисуется: слово и буквы уже ушли, на экране
  // ровное поле точек и «дышащая» оранжевая — кадр, на котором можно стоять.
  T.hold = T.flip[0] - 0.01;
  // В короткой пока грузится сам бандл (React ещё ничего не нарисовал), стоим на слове:
  // ожидание уходит на название сервиса. Данные страницы догружаются уже под полем точек.
  T.brandHold = MODE === 'short' ? T.wordOut - 0.01 : -1;

  const HAPTICS =
    MODE === 'full'
      ? [
          [T.click, 'impact', 'light'],
          [T.knobFly + 0.28, 'impact', 'soft'],
          [T.graph + G_DUR, 'impact', 'medium'],
          [T.grow[1], 'impact', 'heavy'],
          [T.fill[1], 'impact', 'light'],
          [T.orbitOut, 'selection'],
          [T.home[1], 'success'],
        ]
      : [
          [0.55, 'impact', 'light'],
          [T.home[1], 'success'],
        ];

  /* ── математика ── */
  const PI = Math.PI;
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, k) {
    return a + (b - a) * k;
  }
  function seg(t, a, b) {
    return clamp((t - a) / (b - a), 0, 1);
  }
  function eOut(k) {
    return 1 - (1 - k) ** 3;
  }
  function eIn(k) {
    return k * k * k;
  }
  function eIO(k) {
    return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  }
  // недодемпфированная пружина 0 → 1, x(0)=0, x'(0)=0
  function spring(tau, z, w) {
    if (tau <= 0) return 0;
    const wd = w * Math.sqrt(1 - z * z);
    const a = z * w;
    return 1 - Math.exp(-a * tau) * (Math.cos(wd * tau) + (a / wd) * Math.sin(wd * tau));
  }
  // график скорости: растёт всё время, к концу — 25 000 Мбит/с
  const G_MAX = 25000;
  function gCurve(tau) {
    const k = clamp(tau / G_DUR, 0, 1);
    return 0.3 * k + 0.7 * k * k * (3 - 2 * k);
  }
  function fmtInt(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function mix(c1, c2, k) {
    const a = parseInt(c1.slice(1), 16);
    const b = parseInt(c2.slice(1), 16);
    return (
      'rgb(' +
      Math.round(lerp(a >> 16, b >> 16, k)) +
      ',' +
      Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)) +
      ',' +
      Math.round(lerp(a & 255, b & 255, k)) +
      ')'
    );
  }
  function hash01(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ── раскладка: пересчитывается при смене размера ── */
  let L = {};
  let home = null; // куда садится точка; считается один раз, когда приложение готово
  function font(px, w) {
    return `${w || 700} ${px}px ${FONT}`;
  }
  function layout() {
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Холст пересоздаём, только если размер правда изменился: Telegram при старте шлёт
    // подряд несколько событий resize (expand, safe area), а пересоздание сбрасывает кадр.
    if (cv.width !== Math.round(W * DPR) || cv.height !== Math.round(H * DPR)) {
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const u = Math.min(W / 1100, H / 1000);
    L = { W: W, H: H, cx: W / 2, cy: H / 2, u: u, dpr: DPR, spr: {} };
    L.Rc = Math.hypot(W, H) / 2 + 4;
    L.r0 = Math.max(9, Math.min(W, H) * 0.031); // точка с экрана загрузки Telegram (замерено по превью BotFather: 6,2% ширины в диаметре)

    ctx.font = font(100);
    const wordW100 = ctx.measureText(WORD).width;
    const groupW100 = ctx.measureText(LABEL).width + 100 * (0.56 * 1.8 + 0.3);
    const fs = Math.min(132 * u, (W * 0.84) / (Math.max(wordW100, groupW100) / 100));
    L.fs = fs;
    ctx.font = font(fs);
    L.base = L.cy + fs * 0.3;

    function positions(str, x0) {
      const out = [];
      for (let i = 0; i < str.length; i++) {
        out.push(x0 + ctx.measureText(str.slice(0, i)).width + ctx.measureText(str[i]).width / 2);
      }
      return out;
    }
    L.wordX = positions(WORD, L.cx - ctx.measureText(WORD).width / 2);

    L.th = fs * 0.56;
    L.tw = L.th * 1.8;
    const gap = fs * 0.3;
    const labW = ctx.measureText(LABEL).width;
    const gx = L.cx - (L.tw + gap + labW) / 2;
    L.trackL = gx;
    L.trackR = gx + L.tw;
    L.trackY = L.base - (ctx.measureText('o').actualBoundingBoxAscent || fs * 0.5) / 2;
    L.kr = L.th * 0.36;
    L.knobOff = gx + L.th / 2;
    L.knobOn = gx + L.tw - L.th / 2;
    L.labX = positions(LABEL, gx + L.tw + gap);

    const ascI = ctx.measureText('i').actualBoundingBoxAscent || fs * 0.72;
    const ascJ = ctx.measureText('ı').actualBoundingBoxAscent || fs * 0.5;
    const dotH = Math.max(ascI - ascJ, fs * 0.1);
    L.rt = dotH * 0.36;
    L.tx = L.wordX[TITTLE_AT];
    L.ty = L.base - ascI + dotH * 0.36;

    L.gw = Math.min(820 * u, W * 0.8);
    L.A = Math.min(190 * u, H * 0.2);
    L.ox = L.cx - L.gw / 2;
    L.oy = L.cy + L.A;
    L.rg = Math.max(5, 11 * u);
    L.lw = Math.max(2, 4 * u);
    L.callFs = Math.max(14, 30 * u);

    L.S0 = Math.min(300 * u, 0.36 * Math.min(W, H));

    L.Rr = Math.min(330 * u, 0.4 * Math.min(W, H));
    ctx.font = font(100, 600);
    L.ofs = (100 * (2 * PI * L.Rr)) / ctx.measureText(ORBIT).width;
    ctx.font = font(L.ofs, 600);
    L.orbit = [];
    for (let i = 0; i < ORBIT.length; i++) {
      L.orbit.push({
        ch: ORBIT[i],
        s: (ctx.measureText(ORBIT.slice(0, i)).width + ctx.measureText(ORBIT[i]).width / 2) / L.Rr,
      });
    }

    const g = Math.max(W < 700 ? 17 : 14, 26 * u); // на телефоне сетка реже: меньше окон на кадр раскрытия
    L.g = g;
    L.Dmax = Math.hypot(W / 2, H / 2) + g;
    L.grid = [];
    const nx = Math.ceil(W / 2 / g) + 1;
    const ny = Math.ceil(H / 2 / g) + 1;
    for (let iy = -ny; iy <= ny; iy++) {
      for (let ix = -nx; ix <= nx; ix++)
        L.grid.push(L.cx + ix * g, L.cy + iy * g, Math.hypot(ix * g, iy * g));
    }
  }

  /* ── куда садится точка: активный пункт видимой навигации ── */
  function visible(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.5)
        return false;
    }
    return true;
  }
  function firstVisible(selector) {
    const els = document.querySelectorAll(selector);
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > L.H || !visible(els[i])) continue;
      return els[i];
    }
    return null;
  }
  function center(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function findHome() {
    const item = firstVisible('[data-intro-nav][aria-current="page"]');
    if (item) return center(item.querySelector('svg') || item);
    const spot = firstVisible('[data-intro-home]');
    return spot ? center(spot) : null;
  }
  function appMounted() {
    return !!document.getElementById('root')?.firstElementChild;
  }
  function appReady() {
    const app = document.getElementById('root');
    return !!app?.firstElementChild && !document.querySelector('[data-page-loader]');
  }

  /* ── отрисовка ── */
  // Буквы кольца и точки растра рисуются один раз в маленький холст и дальше только копируются:
  // fillText и arc на каждую из сотен фигур каждого кадра — самое дорогое для телефона.
  function sprite(key, w, h, draw) {
    const s = L.spr[key];
    if (s) return s;
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    c.width = Math.ceil(w * L.dpr);
    c.height = Math.ceil(h * L.dpr);
    x.scale(L.dpr, L.dpr);
    draw(x);
    L.spr[key] = { c: c, w: w, h: h };
    return L.spr[key];
  }
  function letter(ch, col) {
    ctx.font = font(L.ofs, 600);
    const w = Math.ceil(ctx.measureText(ch).width + L.ofs * 0.4);
    const h = Math.ceil(L.ofs * 1.6);
    return sprite(`l${ch}${col}`, w, h, (x) => {
      x.font = font(L.ofs, 600);
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = col;
      x.fillText(ch, w / 2, h / 2);
    });
  }
  const DISC = 16; // радиус точки-заготовки, px: крупнее любой точки растра, чтобы копия не мылилась
  function disc() {
    return sprite('disc', DISC * 2, DISC * 2, (x) => {
      x.fillStyle = TX;
      x.beginPath();
      x.arc(DISC, DISC, DISC, 0, 2 * PI);
      x.fill();
    });
  }
  const odx = []; // точки рассыпавшихся букв кольца (x, y, яркость) — рисуются одной пачкой
  function dot(x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(r, 0), 0, 2 * PI);
    ctx.fill();
  }
  function rrect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  function glyph(ch, x, y, rot, sx, sy, alpha, col) {
    if (alpha <= 0.002) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col || TX;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  function cursor(x, y, s, alpha) {
    if (alpha <= 0) return;
    const p = [
      [0, 0],
      [0, 1.05],
      [0.27, 0.8],
      [0.46, 1.2],
      [0.62, 1.13],
      [0.44, 0.74],
      [0.78, 0.74],
    ];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.07;
    ctx.strokeStyle = BG;
    ctx.fillStyle = TX;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function graphPoint(tau) {
    return { x: L.ox + L.gw * clamp(tau / G_DUR, 0, 1), y: L.oy - L.A * gCurve(tau) };
  }

  // оранжевая точка — одна на всю заставку
  function orange(t) {
    let x;
    let y;
    let r;
    let j;
    if (MODE === 'full') {
      if (t < T.pre[1]) {
        // с экрана загрузки Telegram: точка по центру откатывается в ручку переключателя
        const m = eIO(seg(t, T.pre[0], T.pre[1]));
        x = lerp(L.cx, L.knobOff, m);
        y = lerp(L.cy, L.trackY, m);
        r = lerp(L.r0, L.kr, m);
      } else if (t < T.knobFly) {
        x = lerp(L.knobOff, L.knobOn, spring(t - T.click, 0.45, 24));
        y = L.trackY;
        r = L.kr;
      } else if (t < T.jump[0]) {
        const s = spring(t - T.knobFly, 0.62, 12);
        const sc = clamp(s, 0, 1);
        x = lerp(L.knobOn, L.tx, s);
        y = lerp(L.trackY, L.ty, s) - L.fs * 0.55 * Math.sin(PI * sc);
        r = lerp(L.kr, L.rt, sc);
      } else if (t < T.graph) {
        j = eIO(seg(t, T.jump[0], T.jump[1]));
        x = lerp(L.tx, L.ox, j);
        y = lerp(L.ty, L.oy, j) - L.fs * 1.1 * 4 * j * (1 - j);
        r = lerp(L.rt, L.rg, j);
      } else if (t < T.shoot[0]) {
        const gp = graphPoint(t - T.graph); // та же кривая, что рисует линию
        x = gp.x;
        y = gp.y;
        r = L.rg;
      } else if (t < T.shoot[1]) {
        x = lerp(L.ox + L.gw, L.cx, eIO(seg(t, T.shoot[0], T.shoot[1])));
        y = L.cy;
        r = L.rg;
      } else {
        x = L.cx;
        y = L.cy;
        r = L.rg;
      }
    } else if (t < T.jump[0]) {
      // короткая: точка с экрана загрузки взлетает над «i»
      const u2 = spring(t - T.rise, 0.6, 12);
      x = lerp(L.cx, L.tx, u2);
      y = lerp(L.cy, L.ty, u2) - L.fs * 0.9 * Math.sin(PI * clamp(u2, 0, 1));
      r = lerp(L.r0, L.rt, clamp(u2, 0, 1));
    } else {
      j = eIO(seg(t, T.jump[0], T.jump[1]));
      x = lerp(L.tx, L.cx, j);
      y = lerp(L.ty, L.cy, j) - L.fs * 0.8 * 4 * j * (1 - j);
      r = lerp(L.rt, L.rg, j);
    }
    if (t >= T.home[0]) {
      const h = eIO(seg(t, T.home[0], T.home[1]));
      if (home) {
        x = lerp(L.cx, home.x, h);
        y = lerp(L.cy, home.y, h) - Math.min(L.H * 0.14, 110) * Math.sin(PI * h);
        r = lerp(L.rg, 4, h);
      } else {
        // пункта нет — точка просто садится: короткий пружинный «присед» и гаснет
        x = L.cx;
        y = L.cy + 26 * spring(t - T.home[0], 0.45, 14);
        r = L.rg * (1 - eIn(seg(t, T.home[0], T.end)));
      }
    }
    return { x: x, y: y, r: r };
  }

  function seek(t, breath) {
    const W = L.W;
    const H = L.H;
    const cx = L.cx;
    const cy = L.cy;
    const fs = L.fs;
    let i;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H); // непрозрачная заливка и так затирает прошлый кадр
    const o = orange(t);
    // первый кадр — точка цвета экрана загрузки Telegram, дальше она «загорается» оранжевой
    const dotCol = mix(SPLASH_DOT, OR, eOut(seg(t, 0.05, 0.5)));

    /* 1 · переключатель, подпись и слово */
    if (MODE === 'full' && t < T.wordOut + 0.5) {
      ctx.font = font(fs);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const on = clamp(spring(t - T.click, 0.45, 24), 0, 1.2);
      const col = seg(t, T.click, T.click + 0.08);
      const grow = eOut(seg(t, T.pre[0], T.pre[1]));
      const k = eIn(seg(t, T.trackOut[0], T.trackOut[1]));
      if (grow > 0 && k < 1) {
        // дорожка вырастает из точки и в конце сжимается к ручке
        const kx = lerp(L.knobOff, L.knobOn, on);
        const l0 = lerp(L.knobOff - L.th / 2, L.trackL, grow);
        const r0 = lerp(L.knobOff + L.th / 2, L.trackR, grow);
        const l = lerp(l0, kx - L.kr, k);
        const rr = lerp(r0, kx + L.kr, k);
        const th = L.th * (1 - k * 0.3);
        ctx.globalAlpha = (1 - k) * seg(t, T.pre[0], T.pre[0] + 0.15);
        rrect(l, L.trackY - th / 2, rr - l, th, th / 2);
        ctx.fillStyle = '#151826';
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, fs * 0.025);
        ctx.strokeStyle = mix('#3a3f52', OR, col);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (i = 0; i < LABEL.length; i++) {
        const ch = LABEL[i];
        const inK = spring(t - (T.labIn + i * 0.02), 0.6, 18);
        const inA = seg(t, T.labIn + i * 0.02, T.labIn + i * 0.02 + 0.1);
        const lift = fs * 0.4 * (1 - clamp(inK, 0, 1.2));
        if (CARRY[i] !== undefined) {
          const target = CARRY[i];
          const s = clamp(spring(t - (T.carry + i * 0.012), 0.6, 13), 0, 1.2);
          const gx = lerp(L.labX[i], L.wordX[target], s);
          const gy = L.base - fs * 0.35 * Math.sin(PI * clamp(s, 0, 1)) + lift;
          const fade = clamp(s * 1.6 - 0.3, 0, 1);
          const out = eIn(
            seg(t, T.wordOut + target * T.outStagger, T.wordOut + T.outDur + target * T.outStagger),
          );
          glyph(ch, gx, gy + fs * 0.35 * out, 0, 1, 1, inA * (1 - fade) * (1 - out));
          glyph(
            WORD[target],
            gx,
            gy + fs * 0.35 * out,
            0,
            1,
            1,
            fade * (1 - out),
            mix(TX, OR, fade),
          );
          continue;
        }
        const a = eIn(seg(t, T.labOut + i * 0.02, T.labOut + 0.26 + i * 0.02));
        const dir = i % 2 ? 1 : -1;
        glyph(
          ch,
          L.labX[i] + dir * fs * 0.1 * a,
          L.base + fs * 0.55 * a + lift,
          dir * 0.6 * a,
          1,
          1 - 0.3 * a,
          inA * (1 - clamp(a * 1.5, 0, 1)),
        );
      }
    }
    if (t < T.wordOut + 0.5) {
      ctx.font = font(fs);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      let n = 0;
      for (let w = 0; w < WORD.length; w++) {
        if (MODE === 'full' && CARRIED[w]) continue;
        const st = T.wordIn + n++ * 0.018;
        const p = spring(t - st, 0.55, 20);
        const out2 = eIn(
          seg(t, T.wordOut + w * T.outStagger, T.wordOut + T.outDur + w * T.outStagger),
        );
        glyph(
          w === TITTLE_AT ? 'ı' : WORD[w],
          L.wordX[w],
          L.base - fs * 0.6 * (1 - p) + fs * 0.35 * out2,
          -0.25 * (1 - clamp(p, 0, 1)),
          1,
          1,
          seg(t, st, st + 0.08) * (1 - out2),
          w >= BRAND_AT ? OR : TX,
        );
      }
    }

    /* 2 · график скорости */
    if (MODE === 'full' && t > T.axis[0] && t < T.grow[0] + 0.05) {
      const fadeG = 1 - seg(t, T.graphOut[0], T.graphOut[1]);
      ctx.lineCap = 'round';
      const ax = eOut(seg(t, T.axis[0], T.axis[1]));
      ctx.globalAlpha = 0.16 * fadeG;
      ctx.strokeStyle = TX;
      ctx.lineWidth = Math.max(1, 2 * L.u);
      ctx.beginPath();
      ctx.moveTo(L.ox, L.oy);
      ctx.lineTo(L.ox + L.gw * ax, L.oy);
      ctx.stroke();
      const tl = eOut(seg(t, T.target[0], T.target[1]));
      const tr = t < T.shoot[0] ? L.ox + L.gw * tl : o.x;
      ctx.globalAlpha =
        0.34 * (t < T.shoot[0] ? 1 : 1 - seg(t, T.shoot[1] - 0.04, T.grow[0] + 0.05));
      ctx.setLineDash([Math.max(4, 8 * L.u), Math.max(5, 10 * L.u)]);
      ctx.beginPath();
      ctx.moveTo(L.ox, cy);
      ctx.lineTo(tr, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      const tau = Math.min(t - T.graph, G_DUR);
      if (tau > 0) {
        ctx.globalAlpha = fadeG;
        ctx.strokeStyle = OR;
        ctx.lineWidth = L.lw;
        ctx.beginPath();
        ctx.moveTo(L.ox, L.oy);
        for (i = 1; i <= 90; i++) {
          const pt = graphPoint((tau * i) / 90);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
      const cin = spring(t - T.graph + 0.05, 0.6, 16);
      if (cin > 0) {
        const cf = L.callFs;
        const ux = L.ox + L.gw;
        const uy = cy - cf * 0.95;
        const done = t - (T.graph + G_DUR);
        const pop = done > 0 ? 1 + 0.12 * Math.exp(-7 * done) * Math.sin(20 * done) : 1;
        ctx.globalAlpha = clamp(cin, 0, 1) * (1 - seg(t, T.graphOut[0], T.graphOut[0] + 0.18));
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.font = font(cf * 0.72, 600);
        ctx.fillStyle = '#A4AAC0';
        const uw = ctx.measureText(TXT.unit).width;
        ctx.fillText(TXT.unit, ux, uy);
        ctx.save();
        ctx.translate(ux - uw - cf * 0.35, uy + cf * 0.3 * (1 - clamp(cin, 0, 1)));
        ctx.scale(pop, pop);
        ctx.font = font(cf * 1.45);
        ctx.fillStyle = done > 0 ? OR : TX;
        ctx.fillText(fmtInt(Math.round((G_MAX * gCurve(Math.max(tau, 0))) / 10) * 10), 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    /* 3 · одна фигура: круг → скруглённый квадрат → таблетка → точка */
    if (MODE === 'full' && t >= T.grow[0] && t < T.fill[1] + 0.06) {
      dot(cx, cy, lerp(L.rg, L.Rc, eIO(seg(t, T.grow[0], T.grow[1]))), OR);
      if (t > T.hole) {
        const sz = L.S0 * spring(t - T.hole, 0.45, 14);
        const rot = PI * spring(t - T.hole, 0.5, 10);
        const e = clamp(spring(t - T.pill, 0.7, 18), 0, 1.05);
        const f = eIO(seg(t, T.fill[0], T.fill[1]));
        const ph = lerp(lerp(sz, L.S0 * 0.72, e), L.Rc * 2.2, f);
        const pw = lerp(lerp(sz, L.S0 * 1.75, e), L.Rc * 2.2, f);
        const pr = lerp(lerp(sz * 0.24, ph / 2, e), ph / 2, f);
        if (sz > 0.5) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          rrect(-pw / 2, -ph / 2, pw, ph, pr);
          ctx.fillStyle = BG;
          ctx.fill();
          ctx.restore();
        }
      }
    }

    /* 4 · платформы вокруг точки → разлетаются в мелкие точки */
    if (MODE === 'full' && t > T.orbit && t < T.wave[0] + 0.4) {
      const spin = -(t - T.orbit) * 0.38 - 1.1 * (1 - eOut(seg(t, T.orbit, T.orbit + 0.7)));
      for (i = 0; i < L.orbit.length; i++) {
        const ol = L.orbit[i];
        if (ol.ch === ' ') continue;
        const st2 = T.orbit + i * 0.007;
        let rad = L.Rr * spring(t - st2, 0.55, 15);
        const ex = eIn(seg(t, T.orbitOut + hash01(i) * 0.14, T.orbitOut + 0.28 + hash01(i) * 0.14));
        rad += ex * L.Dmax * 0.7;
        const th2 = -PI / 2 + spin + ol.s;
        const lx = cx + Math.cos(th2) * rad;
        const ly = cy + Math.sin(th2) * rad;
        const la = seg(t, st2, st2 + 0.08) * (1 - clamp(ex * 1.6, 0, 1));
        if (la > 0.002) {
          const sp = letter(ol.ch, ol.ch === '·' ? OR : TX);
          const k2 = 1 - 0.7 * ex;
          const rot2 = th2 + PI / 2;
          const c2 = Math.cos(rot2) * k2 * L.dpr;
          const s2 = Math.sin(rot2) * k2 * L.dpr;
          ctx.globalAlpha = la;
          ctx.setTransform(c2, s2, -s2, c2, lx * L.dpr, ly * L.dpr);
          ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
        }
        if (ex > 0) odx.push(lx, ly, clamp(ex * 2, 0, 1));
      }
      ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
      // буквы рассыпаются в точки — те же точки, что дальше станут растром
      const dc = disc();
      const orr = L.g * 0.14;
      for (i = 0; i < odx.length; i += 3) {
        ctx.globalAlpha = 0.55 * odx[i + 2];
        ctx.drawImage(dc.c, odx[i] - orr, odx[i + 1] - orr, orr * 2, orr * 2);
      }
      odx.length = 0;
      ctx.globalAlpha = 1;
    }

    /* 5 · растр: волна точек от оранжевой, потом точки становятся окнами в приложение */
    if (t > T.wave[0]) {
      const g = L.g;
      const grid = L.grid;
      const F1 = eOut(seg(t, T.wave[0], T.wave[1])) * (L.Dmax + 6 * g);
      const F2 = eIO(seg(t, T.flip[0], T.flip[1])) * (L.Dmax + 8 * g);
      if (F2 > 0) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.beginPath();
        // внутри волны окна уже полного размера и сливаются (радиус 0.74g > g/√2) — там одно большое
        // окно вместо сотен кругов; по отдельности рисуется только кромка
        const Rin = F2 - 6 * g;
        if (Rin > 0) {
          ctx.moveTo(cx + Rin, cy);
          ctx.arc(cx, cy, Rin, 0, 2 * PI);
        }
        for (i = 0; i < grid.length; i += 3) {
          if (grid[i + 2] + 0.74 * g < Rin) continue;
          const hr = 0.74 * g * clamp((F2 - grid[i + 2]) / (5 * g), 0, 1);
          if (hr > 0.3) {
            ctx.moveTo(grid[i] + hr, grid[i + 1]);
            ctx.arc(grid[i], grid[i + 1], hr, 0, 2 * PI);
          }
        }
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 0.5;
      const ds = disc();
      for (i = 0; i < grid.length; i += 3) {
        const d = grid[i + 2];
        if (F2 - d > 0) continue;
        const gr = clamp((F1 - d) / (3 * g), 0, 1);
        if (gr <= 0) continue;
        const crest = 1 + 0.9 * Math.exp(-(((F1 - d) / (2 * g)) ** 2));
        const near = 1 + 1.4 * Math.exp(-d / (5 * g));
        const rd = g * 0.12 * gr * crest * near;
        if (rd > 0.15) ctx.drawImage(ds.c, grid[i] - rd, grid[i + 1] - rd, rd * 2, rd * 2);
      }
      ctx.globalAlpha = 1;
    }

    /* оранжевая точка — поверх всего */
    const hidden = MODE === 'full' && t > T.grow[0] + 0.02 && t < T.hole + 0.05; // внутри круга сливается с ним
    if (!hidden) {
      const br = breath ? 1 + 0.14 * breath : 1; // «дыхание», пока ждём приложение
      const fadeOut = home ? 1 - seg(t, T.home[1] + 0.04, T.end) : 1;
      ctx.globalAlpha = fadeOut;
      dot(o.x, o.y, o.r * br, dotCol);
      if (home && t > T.home[1]) {
        // точка села в пункт — короткое кольцо-отклик
        const ping = seg(t, T.home[1], T.end);
        ctx.globalAlpha = 1 - ping;
        ctx.strokeStyle = OR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(o.x, o.y, lerp(5, 20, eOut(ping)), 0, 2 * PI);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* курсор (полный режим) */
    if (MODE === 'full' && t > T.cursor[0] && t < T.cursor[3]) {
      const cs = Math.max(20, 34 * L.u);
      const arr = eOut(seg(t, T.cursor[0], T.cursor[1]));
      const leave = eIn(seg(t, T.cursor[2], T.cursor[3]));
      const px0 = L.knobOff + cs * 0.15;
      const py0 = L.trackY + cs * 0.05;
      const cxp = lerp(lerp(W * 0.78, px0, arr), px0 + W * 0.18, leave);
      const cyp = lerp(lerp(H * 0.86, py0, arr), py0 + H * 0.25, leave);
      const pressIn = seg(t, T.click - 0.06, T.click);
      const press = 1 - 0.14 * pressIn * (1 - spring(t - T.click, 0.4, 28));
      cursor(cxp, cyp, cs * press, seg(t, T.cursor[0], T.cursor[0] + 0.1) * (1 - leave));
    }
  }

  /* ── управляющий цикл ── */
  let film = 0;
  let last = 0;
  let held = 0;
  let readySince = 0;
  let raf = 0;
  let readySent = false;
  let hIdx = 0;
  let breath = 0;
  let holdN = 0;
  let passThrough = false;

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    root.classList.remove('bc-intro');
    root.removeAttribute('data-intro');
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    if (skip.parentNode) skip.parentNode.removeChild(skip);
    window.removeEventListener('resize', layout);
    releaseColors();
    document.dispatchEvent(new Event('intro:done'));
  }
  function sendReady() {
    if (readySent) return;
    readySent = true;
    if (inTg) tgPost('web_app_ready');
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    const ready = appReady();
    readySince = ready ? readySince || now : 0;
    const settled = ready && now - readySince > 200;
    let drawNow = true;
    const waiting =
      (film >= T.hold && !settled) || (film >= T.brandHold && film < T.wordOut && !appMounted());
    if (waiting && held < 8) {
      // приложение ещё грузится: держим кадр, точка «дышит». Рисуем раз в три кадра (~20 к/с):
      // дыхание медленное, а процессор нужен самой загрузке приложения.
      held += dt;
      breath = 0.5 - 0.5 * Math.cos(held * 4.2);
      drawNow = holdN++ % 3 === 0;
    } else {
      breath *= Math.exp(-dt * 10); // дыхание затухает, а не обрывается
      const prev = film;
      film += dt;
      // точку посадки пересчитываем на лету, пока она летит: вёрстка (безопасные зоны Telegram,
      // панель) могла сдвинуться, и садиться надо туда, где пункт сейчас, а не где он был
      if (film >= T.home[0] && film < T.home[1]) home = findHome() || home;
      while (hIdx < HAPTICS.length && HAPTICS[hIdx][0] <= film) {
        if (HAPTICS[hIdx][0] > prev - 0.25) haptic(HAPTICS[hIdx][1], HAPTICS[hIdx][2]);
        hIdx++;
      }
    }
    if (film >= T.end) return finish();
    // с начала раскрытия пропускать уже нечего, а кнопка закрывала бы нижнюю панель, куда садится точка
    if (film >= T.flip[0] - 0.05) {
      if (skip.parentNode) skip.parentNode.removeChild(skip);
      // приложение уже видно сквозь окна растра и готово — касания должны доходить до него, а не
      // тонуть в заставке (иначе первое нажатие на панель пропадало, и жать приходилось дважды)
      if (!passThrough) {
        passThrough = true;
        wrap.style.pointerEvents = 'none';
      }
    }
    if (drawNow) seek(film, breath);
    sendReady();
    raf = requestAnimationFrame(frame);
  }

  function onSkip() {
    // Пропуск — сразу к раскрытию: приложение открывается, точка всё равно садится в пункт.
    if (film < T.flip[0] - 0.05) {
      film = T.flip[0] - 0.05;
      hIdx = 0;
      while (hIdx < HAPTICS.length && HAPTICS[hIdx][0] <= film) hIdx++;
    }
    if (skip.parentNode) skip.parentNode.removeChild(skip);
  }

  function start() {
    layout();
    if (frozenAt !== null) {
      seek(frozenAt, 0);
      sendReady();
      window.__introSeek = (t) => {
        if (t >= T.home[0] && !home) home = findHome();
        seek(t, 0);
      };
      window.__introFinish = finish;
      return;
    }
    window.addEventListener('resize', layout);
    wrap.addEventListener('click', onSkip);
    skip.addEventListener('click', onSkip);
    raf = requestAnimationFrame(frame);
  }

  // Первый кадр — сразу, без ожидания шрифта: в нём только точка (как на экране
  // загрузки Telegram). Шрифт нужен с первой буквы, ждём его не дольше 600 мс.
  layout();
  seek(0, 0);
  // Дальше фон рисует холст: в конце он прорезает окна в приложение, и сплошной
  // фон подложки закрыл бы их.
  wrap.style.background = 'transparent';
  sendReady();
  const fontsReady = document.fonts?.load
    ? Promise.all([
        document.fonts.load(font(100), `${WORD}ı`),
        document.fonts.load(font(100, 600), ORBIT),
      ])
    : Promise.resolve();
  Promise.race([
    fontsReady,
    new Promise((r) => {
      setTimeout(r, 600);
    }),
  ]).then(start, start);
})();
