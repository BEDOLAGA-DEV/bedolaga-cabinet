import { useTranslation } from 'react-i18next';
import { useBranding } from '@/hooks/useBranding';
import { useMobileAppPromo } from '@/hooks/useMobileAppPromo';
import { useHaptic } from '@/platform';
import { isLogoPreloaded } from '@/api/branding';
import { cn } from '@/lib/utils';
import { UI } from '@/config/constants';

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.365 1.43c0 1.14-.49 2.22-1.28 3-.82.83-2.13 1.46-3.21 1.36-.13-1.1.43-2.27 1.18-3.05.83-.86 2.27-1.5 3.31-1.5l0 .19zM20.5 17.5c-.6 1.36-.88 1.97-1.65 3.18-1.07 1.7-2.58 3.81-4.45 3.83-1.66.02-2.09-1.08-4.35-1.07-2.27.02-2.74 1.09-4.4 1.07-1.87-.02-3.3-1.93-4.37-3.63C-1.6 16.97-1.97 11.13.62 7.71 2.04 5.78 4.27 4.56 6.5 4.56c1.83 0 2.97 1.01 4.47 1.01 1.46 0 2.34-1.01 4.46-1.01 1.6 0 3.3.87 4.51 2.37-3.97 2.18-3.32 7.85.56 8.57z" />
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3.6 1.65c-.36.31-.6.79-.6 1.45v17.8c0 .66.24 1.14.6 1.45l9.74-9.74c.35-.35.35-.92 0-1.27L3.6 1.65zM14.62 12.6l2.42 2.42 4.2-2.4c1.04-.6 1.04-2.14 0-2.74l-4.2-2.4-2.42 2.42L14.62 12.6zM4.65 23.04l11.06-6.32-2.42-2.42L4.65 23.04zM4.65.96l8.64 8.74 2.42-2.42L4.65.96z" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/**
 * Sticky top banner shown to users on iOS / Android / macOS when a matching
 * store URL is configured via env. Hidden inside Telegram Mini App, in PWA
 * standalone mode, and for 7 days after the user dismisses it.
 */
export default function MobileAppBanner() {
  const { t } = useTranslation();
  const { show, os, storeUrl, dismiss } = useMobileAppPromo();
  const { appName, logoUrl, logoLetter, hasCustomLogo } = useBranding();
  const haptic = useHaptic();

  if (!show || !storeUrl) return null;

  const isApple = os === 'ios' || os === 'macos';
  const StoreIcon = isApple ? AppleIcon : PlayIcon;
  const storeLabel = isApple ? t('mobileAppBanner.appStore') : t('mobileAppBanner.googlePlay');

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[60] border-b border-dark-800/60 bg-dark-900/95 px-3 py-2 backdrop-blur-md lg:px-6"
      style={{ height: UI.APP_BANNER_HEIGHT_PX }}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3">
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-dark-800">
          <span
            className={cn(
              'absolute text-sm font-bold text-accent-400 transition-opacity duration-200',
              hasCustomLogo && isLogoPreloaded() ? 'opacity-0' : 'opacity-100',
            )}
          >
            {logoLetter}
          </span>
          {hasCustomLogo && logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className={cn(
                'absolute h-full w-full object-contain transition-opacity duration-200',
                isLogoPreloaded() ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-dark-100">
            {t('mobileAppBanner.title', { appName })}
          </p>
          <p className="truncate text-xs text-dark-400">
            {t('mobileAppBanner.description', { store: storeLabel })}
          </p>
        </div>

        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => haptic.impact('light')}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-400"
        >
          <StoreIcon className="h-4 w-4" />
          <span>{t('mobileAppBanner.install')}</span>
        </a>

        <button
          type="button"
          onClick={() => {
            haptic.impact('light');
            dismiss();
          }}
          aria-label={t('mobileAppBanner.dismiss')}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-100"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
