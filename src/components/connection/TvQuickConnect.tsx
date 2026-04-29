import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  openQrScanner,
  isQrScannerSupported,
  retrieveLaunchParams,
} from '@telegram-apps/sdk-react';

const TG_MOBILE_PLATFORMS = new Set(['ios', 'android', 'android_x', 'ios_x']);

function isTelegramMobile(): boolean {
  try {
    const platform = retrieveLaunchParams().tgWebAppPlatform;
    return TG_MOBILE_PLATFORMS.has(platform);
  } catch {
    return false;
  }
}

const HAPP_TV_API = 'https://check.happ.su/sendtv';
const HTML5_QRCODE_CDN = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';

interface Props {
  subscriptionUrl: string;
  isLight: boolean;
}

interface Html5QrcodeInstance {
  start: (
    cameraIdOrConfig: { facingMode: string } | string,
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decoded: string) => void,
    onError: () => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
}

export default function TvQuickConnect({ subscriptionUrl, isLight }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [tgNative, setTgNative] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);

  useEffect(() => {
    try {
      setTgNative(isTelegramMobile() && isQrScannerSupported() && openQrScanner.isAvailable());
    } catch {
      setTgNative(false);
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => undefined)
          .finally(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          });
      }
    };
  }, []);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const sendToTV = useCallback(
    async (tvCode: string) => {
      if (sending) return;
      const clean = tvCode.trim().toUpperCase();
      if (!(clean.length === 5 && /^[A-Z0-9]+$/.test(clean))) {
        showToast(t('subscription.tvQuickConnect.badCode'), 'error');
        return;
      }

      setSending(true);
      try {
        const b64 = btoa(unescape(encodeURIComponent(subscriptionUrl)));
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);

        const res = await fetch(`${HAPP_TV_API}/${encodeURIComponent(clean)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: b64 }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          showToast(t('subscription.tvQuickConnect.sent'), 'success');
          setCode('');
        } else {
          showToast(t('subscription.tvQuickConnect.error'), 'error');
        }
      } catch {
        showToast(t('subscription.tvQuickConnect.error'), 'error');
      } finally {
        setSending(false);
      }
    },
    [sending, subscriptionUrl, showToast, t],
  );

  const stopScan = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => undefined)
        .finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        });
    }
    setScanning(false);
  }, []);

  const onScanDecoded = useCallback(
    (decoded: string) => {
      const parsed = parseQRCode(decoded);
      if (!parsed) return;
      stopScan();
      setCode(parsed);
      showToast(`${t('subscription.tvQuickConnect.codeFound')}: ${parsed}`, 'success');
      setTimeout(() => sendToTV(parsed), 500);
    },
    [stopScan, showToast, sendToTV, t],
  );

  const startScan = useCallback(async () => {
    // Telegram Mini App: native scanner
    if (tgNative) {
      try {
        const qr = await openQrScanner({
          text: t('subscription.tvQuickConnect.scanDescription'),
          capture: (s: string) => parseQRCode(s) !== null,
        });
        if (qr) {
          const parsed = parseQRCode(qr);
          if (parsed) {
            setCode(parsed);
            showToast(t('subscription.tvQuickConnect.codeFound'), 'success');
            sendToTV(parsed);
          }
        }
      } catch {
        showToast(t('subscription.tvQuickConnect.error'), 'error');
      }
      return;
    }

    // Browser fallback (Mac/iOS Safari, desktop Chrome): html5-qrcode
    type WindowWithHtml5 = Window & { Html5Qrcode?: new (id: string) => Html5QrcodeInstance };
    const w = window as WindowWithHtml5;
    if (!w.Html5Qrcode) {
      const script = document.createElement('script');
      script.src = HTML5_QRCODE_CDN;
      document.head.appendChild(script);
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject();
      }).catch(() => undefined);
    }
    if (!w.Html5Qrcode) {
      showToast(t('subscription.tvQuickConnect.noCamera'), 'error');
      return;
    }
    setScanning(true);
    const scanner = new w.Html5Qrcode('tv-qr-reader');
    scannerRef.current = scanner;
    const config = { fps: 10, qrbox: { width: 220, height: 220 } };
    try {
      await scanner.start({ facingMode: 'environment' }, config, onScanDecoded, () => undefined);
    } catch {
      try {
        await scanner.start({ facingMode: 'user' }, config, onScanDecoded, () => undefined);
      } catch {
        showToast(t('subscription.tvQuickConnect.noCamera'), 'error');
        scannerRef.current = null;
        setScanning(false);
      }
    }
  }, [tgNative, sendToTV, showToast, onScanDecoded, t]);

  const cardClass = isLight
    ? 'rounded-2xl border border-dark-700/60 bg-white/80 shadow-sm p-4 sm:p-5'
    : 'rounded-2xl border border-dark-700/50 bg-dark-800/50 p-4 sm:p-5';

  const inputClass = isLight
    ? 'w-full rounded-xl border border-dark-700/60 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] uppercase text-dark-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500'
    : 'w-full rounded-xl border border-dark-700 bg-dark-900/50 px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] uppercase text-dark-100 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500';

  return (
    <div className="space-y-3">
      {/* Code input */}
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/10">
            <svg
              className="h-5 w-5 text-accent-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-dark-100">
              {t('subscription.tvQuickConnect.title')}
            </h3>
            <p className="mt-1 text-sm text-dark-400">
              {t('subscription.tvQuickConnect.description')}
            </p>

            <div className="mt-3 space-y-2">
              <input
                type="text"
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="A1B2C"
                autoComplete="one-time-code"
                inputMode="text"
                className={inputClass}
              />
              <button
                onClick={() => sendToTV(code)}
                disabled={sending || code.length !== 5}
                className="btn-primary w-full justify-center py-3 disabled:opacity-50"
              >
                {sending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  t('subscription.tvQuickConnect.sendBtn')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner */}
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
            <svg
              className="h-5 w-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-dark-100">
              {t('subscription.tvQuickConnect.scanTitle')}
            </h3>
            <p className="mt-1 text-sm text-dark-400">
              {t('subscription.tvQuickConnect.scanDescription')}
            </p>

            {!scanning && (
              <button onClick={startScan} className="btn-secondary mt-3 w-full justify-center py-3">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                  />
                </svg>
                {t('subscription.tvQuickConnect.scanBtn')}
              </button>
            )}
            <div className={scanning ? 'mt-3 space-y-2' : 'hidden'}>
              <div id="tv-qr-reader" className="overflow-hidden rounded-xl" />
              {scanning && (
                <button onClick={stopScan} className="btn-secondary w-full justify-center py-2.5">
                  {t('subscription.tvQuickConnect.stopScan')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function parseQRCode(data: string): string | null {
  if (data.length === 5 && /^[A-Z0-9]+$/i.test(data)) {
    return data.toUpperCase();
  }
  try {
    const url = new URL(data);
    const parts = url.pathname.split('/').filter((p) => p.length > 0);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      if (last.length === 5 && /^[A-Z0-9]+$/i.test(last)) return last.toUpperCase();
    }
    const codeParam = url.searchParams.get('code');
    if (codeParam?.length === 5 && /^[A-Z0-9]+$/i.test(codeParam)) return codeParam.toUpperCase();
  } catch {
    const m = data.match(/[/=]([A-Z0-9]{5})(?:[/?&\s]|$)/i);
    if (m?.[1]) return m[1].toUpperCase();
  }
  return null;
}
