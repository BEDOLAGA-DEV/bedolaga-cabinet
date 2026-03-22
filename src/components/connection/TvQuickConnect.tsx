import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const HAPP_TV_API = 'https://check.happ.su/sendtv';

interface Props {
  subscriptionUrl: string;
  isLight: boolean;
}

export default function TvQuickConnect({ subscriptionUrl, isLight }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sendToTVRef = useRef<(code: string) => void>(() => {});

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false);
    }
  }, []);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const sendToTV = useCallback(async (tvCode: string) => {
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
  }, [sending, subscriptionUrl, showToast, t]);

  // Keep ref in sync so scanFrame can call latest sendToTV
  sendToTVRef.current = sendToTV;

  const stopScan = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  // Start camera when scanning becomes true
  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;
    let rafId = 0;

    function scanFrame() {
      if (cancelled || !scanningRef.current || !videoRef.current) return;
      const video = videoRef.current;
      if (!streamRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (streamRef.current) rafId = requestAnimationFrame(scanFrame);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!ctx) { rafId = requestAnimationFrame(scanFrame); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsQRFn = (window as any).jsQR;
        if (jsQRFn) {
          const qr = jsQRFn(imageData.data, imageData.width, imageData.height);
          if (qr && qr.data) {
            const parsed = parseQRCode(qr.data);
            if (parsed) {
              scanningRef.current = false;
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((tr) => tr.stop());
                streamRef.current = null;
              }
              if (videoRef.current) videoRef.current.srcObject = null;
              setScanning(false);
              setCode(parsed);
              setTimeout(() => sendToTVRef.current(parsed), 500);
              return;
            }
          }
        }
      } catch { /* continue */ }

      rafId = requestAnimationFrame(scanFrame);
    }

    (async () => {
      if (cancelled) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        scanningRef.current = true;
        rafId = requestAnimationFrame(scanFrame);
      } catch {
        if (!cancelled) {
          setScanning(false);
          setToast({ text: t('subscription.tvQuickConnect.noCamera'), type: 'error' });
          setTimeout(() => setToast(null), 3000);
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      scanningRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, [scanning, t]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
      }
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
            <svg className="h-5 w-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-dark-100">{t('subscription.tvQuickConnect.title')}</h3>
            <p className="mt-1 text-sm text-dark-400">{t('subscription.tvQuickConnect.description')}</p>

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
      {hasCamera && (
        <div className={cardClass}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-dark-100">{t('subscription.tvQuickConnect.scanTitle')}</h3>
              <p className="mt-1 text-sm text-dark-400">{t('subscription.tvQuickConnect.scanDescription')}</p>

              {!scanning ? (
                <button
                  onClick={() => setScanning(true)}
                  className="btn-secondary mt-3 w-full justify-center py-3"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  {t('subscription.tvQuickConnect.scanBtn')}
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="relative overflow-hidden rounded-xl bg-dark-900" style={{ minHeight: 200 }}>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full rounded-xl"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-48 w-48 rounded-2xl border-2 border-accent-500/60" />
                    </div>
                  </div>
                  <button onClick={stopScan} className="btn-secondary w-full justify-center py-2.5">
                    {t('subscription.tvQuickConnect.stopScan')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-500/90 text-white'
            : 'bg-red-500/90 text-white'
        }`}>
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
