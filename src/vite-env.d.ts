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

interface Window {
  Telegram?: {
    Login?: TelegramLoginGlobal;
  };
}
