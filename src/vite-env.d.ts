/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_LOGO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Telegram WebApp global — available when running inside Telegram Mini App */
interface TelegramWebAppGlobal {
  onEvent?: (event: string, callback: () => void) => void;
  offEvent?: (event: string, callback: () => void) => void;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebAppGlobal;
  };
}
