import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../store/auth';
import { useBranding } from '../hooks/useBranding';

interface ConnectionQRState {
  url: string;
  hideLink: boolean;
}

function isValidState(state: unknown): state is ConnectionQRState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;
  return typeof s.url === 'string' && s.url.length > 0 && typeof s.hideLink === 'boolean';
}

export default function ConnectionQR() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { appName } = useBranding();

  const state = location.state as unknown;
  const validState = isValidState(state) ? state : null;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !validState) {
      navigate('/connection', { replace: true });
    }
  }, [isLoading, isAuthenticated, validState, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (isLoading || !validState) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-dark-900 to-dark-950">
      {/* Close button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-dark-800/60 backdrop-blur-sm transition-colors hover:bg-dark-700/80"
        aria-label={t('common.close')}
      >
        <svg
          className="h-5 w-5 text-dark-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex w-full max-w-sm animate-scale-in flex-col items-center px-6">
        {/* Branding name */}
        {appName && (
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
            {appName}
          </p>
        )}

        {/* Title */}
        <h1 className="mb-2 text-center text-xl font-bold text-dark-100">
          {t('subscription.connection.qrTitle')}
        </h1>

        {/* Hint */}
        <p className="mb-8 text-center text-sm text-dark-400">
          {t('subscription.connection.qrScanHint')}
        </p>

        {/* QR code container */}
        <div className="rounded-3xl bg-white p-6">
          <QRCodeSVG
            value={validState.url}
            size={280}
            level="M"
            includeMargin={false}
            className="h-[280px] w-[280px] sm:h-[360px] sm:w-[360px]"
          />
        </div>

        {/* URL display */}
        {!validState.hideLink && (
          <p className="mt-6 max-w-full truncate text-center font-mono text-xs text-dark-500">
            {validState.url}
          </p>
        )}
      </div>
    </div>
  );
}
