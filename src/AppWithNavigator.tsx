import { useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router';
import {
  showBackButton,
  hideBackButton,
  onBackButtonClick,
  offBackButtonClick,
} from '@telegram-apps/sdk-react';
import Twemoji from 'react-twemoji';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlatformProvider } from './platform/PlatformProvider';
import { ThemeColorsProvider } from './providers/ThemeColorsProvider';
import { WebSocketProvider } from './providers/WebSocketProvider';
import { ToastProvider } from './components/Toast';
import { TooltipProvider } from './components/primitives/Tooltip';
import { isInTelegramWebApp } from './hooks/useTelegramSDK';

const TWEMOJI_OPTIONS = { className: 'twemoji', folder: 'svg', ext: '.svg' } as const;

/**
 * Manages Telegram BackButton visibility based on navigation location.
 * Shows back button on non-root routes, hides on root.
 */
/** Pages reachable from bottom nav — treat as top-level (no back button). */
const BOTTOM_NAV_PATHS = ['/', '/subscriptions', '/balance', '/referral', '/support', '/wheel'];

function TelegramBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const isTopLevel = location.pathname === '' || BOTTOM_NAV_PATHS.includes(location.pathname);
    try {
      if (isTopLevel) {
        hideBackButton();
      } else {
        showBackButton();
      }
    } catch {}
  }, [location]);

  // Stable handler — ref prevents re-subscription on every render
  const handler = useCallback(() => {
    navigateRef.current(-1);
  }, []);

  useEffect(() => {
    try {
      onBackButtonClick(handler);
    } catch {}
    return () => {
      try {
        offBackButtonClick(handler);
      } catch {}
    };
  }, [handler]);

  return null;
}

export function AppWithNavigator() {
  const isTelegram = isInTelegramWebApp();

  return (
    <BrowserRouter>
      {isTelegram && <TelegramBackButton />}
      <ErrorBoundary level="page">
        <PlatformProvider>
          <ThemeColorsProvider>
            <TooltipProvider>
              <ToastProvider>
                <WebSocketProvider>
                  <Twemoji options={TWEMOJI_OPTIONS}>
                    <App />
                  </Twemoji>
                </WebSocketProvider>
              </ToastProvider>
            </TooltipProvider>
          </ThemeColorsProvider>
        </PlatformProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
