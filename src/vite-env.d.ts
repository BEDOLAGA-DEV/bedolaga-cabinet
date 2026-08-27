/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_LOGO?: string;
  readonly VITE_MOBILE_DEEPLINK_SCHEME?: string;
  readonly VITE_APP_STORE_URL?: string;
  readonly VITE_PLAY_STORE_URL?: string;
  readonly VITE_MAC_APP_STORE_URL?: string;
  /** Optional override for the backend liveness URL (defaults to `<origin>/health/unified`). */
  readonly VITE_HEALTH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Telegram WebApp global — available when running inside Telegram Mini App */
interface TelegramWebAppGlobal {
  onEvent?: (event: string, callback: () => void) => void;
  offEvent?: (event: string, callback: () => void) => void;
  /** Closes the Mini App (injected by telegram-web-app.js). */
  close?: () => void;
  /**
   * Raw init data, snapshotted by Telegram's own bridge script at page load.
   * Independent of the @telegram-apps/sdk launch-params cache, which can go
   * stale — see src/utils/telegramInitData.ts.
   */
  initData?: string;
}

/** Telegram Login JS SDK — loaded from https://oauth.telegram.org/js/telegram-login.js */
interface TelegramLoginGlobal {
  init: (
    options: {
      client_id: string | number;
      request_access?: string[];
      lang?: string;
    },
    callback: (data: { id_token?: string; user?: Record<string, unknown>; error?: string }) => void,
  ) => void;
  open: () => void;
  auth: () => void;
}

/** Apple Sign In JS SDK — loaded from Apple's hosted appleid.auth.js */
interface AppleSignInUserPayload {
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
}

interface AppleSignInResponse {
  authorization?: {
    code?: string;
    id_token?: string;
    state?: string;
  };
  user?: AppleSignInUserPayload | string;
}

interface AppleSignInInitOptions {
  clientId: string;
  scope?: string;
  redirectURI: string;
  state: string;
  nonce?: string;
  responseType?: string;
  responseMode?: string;
  usePopup?: boolean;
}

interface AppleIDGlobal {
  auth: {
    init: (options: AppleSignInInitOptions) => void;
    signIn: () => Promise<AppleSignInResponse>;
  };
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebAppGlobal;
    Login?: TelegramLoginGlobal;
  };
  AppleID?: AppleIDGlobal;
}
