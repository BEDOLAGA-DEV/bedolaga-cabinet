import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  init,
  restoreInitData,
  mountMiniApp,
  miniAppReady,
  mountThemeParams,
  mountViewport,
  expandViewport,
  mountSwipeBehavior,
  disableVerticalSwipes,
  mountClosingBehavior,
  disableClosingConfirmation,
  mountBackButton,
  bindThemeParamsCssVars,
  bindViewportCssVars,
  requestFullscreen,
  isFullscreen,
} from '@telegram-apps/sdk-react';
import { AppWithNavigator } from './AppWithNavigator';
import { initLogoPreload } from './api/branding';
import { getCachedFullscreenEnabled, isTelegramMobile } from './hooks/useTelegramSDK';
import './i18n';
import './styles/globals.css';

// HMR guard — prevent double init when Vite hot-reloads the module
const HMR_KEY = '__tg_sdk_initialized';
const alreadyInitialized = (window as unknown as Record<string, unknown>)[HMR_KEY] === true;

if (!alreadyInitialized) {
  (window as unknown as Record<string, unknown>)[HMR_KEY] = true;

  try {
    init();
    restoreInitData();

    // Mount components — each in its own try/catch so one failure doesn't block others
    try {
      mountMiniApp();
    } catch {
      /* already mounted */
    }
    try {
      mountThemeParams();
      bindThemeParamsCssVars();
    } catch {
      /* already mounted */
    }
    try {
      mountSwipeBehavior();
      disableVerticalSwipes();
    } catch {
      /* already mounted */
    }
    try {
      mountClosingBehavior();
      disableClosingConfirmation();
    } catch {
      /* already mounted */
    }
    try {
      mountBackButton();
    } catch {
      /* already mounted */
    }
    // Viewport — async, fullscreen зависит от смонтированного viewport
    mountViewport()
      .then(() => {
        bindViewportCssVars();
        expandViewport();

        // Auto-enter fullscreen if enabled in settings (mobile only)
        if (getCachedFullscreenEnabled() && isTelegramMobile()) {
          if (!isFullscreen()) {
            requestFullscreen();
          }
        }
      })
      .catch(() => {});

    miniAppReady();
  } catch {
    // Not in Telegram — ok
  }
}

// Preload logo from cache immediately on page load
initLogoPreload();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppWithNavigator />
    </QueryClientProvider>
  </React.StrictMode>,
);
