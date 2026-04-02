import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

const isInStandaloneMode = () =>
  (window.navigator as any).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    const wasDismissed = localStorage.getItem('pwa-banner-dismissed');
    if (wasDismissed) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    if (isIOS()) {
      setShowIosBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (dismissed || isInStandaloneMode()) return null;

  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-dark-700/50 bg-dark-900/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/20 text-lg font-bold text-accent-400">
            Л
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-dark-100">Установить приложение</p>
            <p className="text-xs text-dark-400">Работает офлайн, быстрый доступ</p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-dark-500 hover:text-dark-300"
            aria-label="Закрыть"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 rounded-xl bg-accent-500 py-2 text-sm font-semibold text-white hover:bg-accent-400"
          >
            Установить
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-dark-700/50 py-2 text-sm font-medium text-dark-400 hover:text-dark-200"
          >
            Не сейчас
          </button>
        </div>
      </div>
    );
  }

  if (showIosBanner) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-dark-700/50 bg-dark-900/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/20 text-lg font-bold text-accent-400">
            Л
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-dark-100">Установить на iPhone</p>
            <p className="mt-1 text-xs leading-relaxed text-dark-400">
              Нажмите{' '}
              <svg
                className="inline h-4 w-4 align-middle text-accent-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>{' '}
              <strong className="text-dark-200">Поделиться</strong>, затем{' '}
              <strong className="text-dark-200">«На экран Домой»</strong>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-dark-500 hover:text-dark-300"
            aria-label="Закрыть"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-2 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-lg bg-dark-800/80 px-3 py-1.5 text-xs text-dark-400">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
            Кнопка внизу экрана
          </div>
        </div>
      </div>
    );
  }

  return null;
}
