import {
  isQrScannerSupported,
  openQrScanner,
  retrieveLaunchParams,
} from '@telegram-apps/sdk-react';

// Сканирование QR внутри Telegram: WebView не даёт нормального доступа к камере,
// поэтому на мобильных клиентах используется НАТИВНЫЙ сканер Telegram, а на вебе
// — html5-qrcode с CDN. Логика вынесена из TvQuickConnect, чтобы её мог
// переиспользовать любой экран (подарки и т.д.).

const TG_MOBILE_PLATFORMS = new Set(['ios', 'android', 'android_x', 'ios_x']);

export const HTML5_QRCODE_CDN = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
// SRI-хеш ИМЕННО этого файла (sha384 от html5-qrcode@2.3.8/html5-qrcode.min.js).
// Без него подмена на стороне CDN исполнилась бы в кабинете с полными правами
// страницы. При несовпадении браузер откажется исполнять скрипт — сканер
// деградирует в «камера недоступна», а не запускает чужой код.
const HTML5_QRCODE_SRI = 'sha384-c9d8RFSL+u3exBOJ4Yp3HUJXS4znl9f+z66d1y54ig+ea249SpqR+w1wyvXz/lk+';

export interface Html5QrcodeInstance {
  start: (
    camera: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decoded: string) => void,
    onError: () => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
}

type WindowWithHtml5 = Window & { Html5Qrcode?: new (id: string) => Html5QrcodeInstance };

export function isTelegramMobile(): boolean {
  try {
    return TG_MOBILE_PLATFORMS.has(retrieveLaunchParams().tgWebAppPlatform);
  } catch {
    return false;
  }
}

/** true — доступен нативный сканер Telegram (мобильный клиент). */
export function canUseTelegramScanner(): boolean {
  try {
    return isTelegramMobile() && isQrScannerSupported() && openQrScanner.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Открывает нативный сканер Telegram. Возвращает распознанную строку либо null,
 * если пользователь закрыл сканер (или он недоступен).
 */
export async function scanWithTelegram(
  text: string,
  capture?: (value: string) => boolean,
): Promise<string | null> {
  const result = await openQrScanner({ text, capture: capture ?? (() => true) });
  return result ?? null;
}

/** Подгружает html5-qrcode с CDN (в бандл не тянем — нужен редко). */
export async function loadHtml5Qrcode(): Promise<WindowWithHtml5['Html5Qrcode'] | undefined> {
  const w = window as WindowWithHtml5;
  if (w.Html5Qrcode) return w.Html5Qrcode;

  const script = document.createElement('script');
  script.src = HTML5_QRCODE_CDN;
  script.integrity = HTML5_QRCODE_SRI;
  script.crossOrigin = 'anonymous';
  script.referrerPolicy = 'no-referrer';
  document.head.appendChild(script);
  await new Promise<void>((resolve) => {
    script.onload = () => resolve();
    // onerror срабатывает и при провале проверки целостности — вызывающий
    // получит undefined и покажет «камера недоступна».
    script.onerror = () => resolve();
  });
  return w.Html5Qrcode;
}

/**
 * Достаёт код подарка из отсканированной строки.
 *
 * Один и тот же подарок распространяется тремя способами, и скан должен понимать
 * все: deep-link бота (``?start=GIFT_<code>``), ссылка кабинета
 * (``/gift?tab=activate&code=<code>``) и просто код (``GIFT-xxxx`` или голый).
 */
export function parseGiftCode(raw: string | null | undefined): string | null {
  const value = (raw || '').trim();
  if (!value) return null;

  const startParam = value.match(/[?&]start=GIFT_([A-Za-z0-9_-]+)/i);
  if (startParam) return startParam[1];

  const cabinetParam = value.match(/[?&]code=([A-Za-z0-9_-]+)/i);
  if (cabinetParam) return cabinetParam[1];

  // Голый код: допускаем префикс GIFT- и разделители, но не произвольный текст —
  // иначе сканер «распознал» бы любую ссылку и подставил мусор в поле.
  const bare = value.replace(/^GIFT[-_]/i, '');
  if (/^[A-Za-z0-9]{6,64}$/.test(bare)) return bare;

  return null;
}
