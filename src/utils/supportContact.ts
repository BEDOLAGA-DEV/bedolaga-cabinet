import type { SupportConfig } from '../types';

/**
 * Куда вести пользователя по кнопке «Написать в поддержку».
 *
 * Telegram-ссылку открывают через openTelegramLink, внешнюю — обычным переходом.
 */
export type SupportContactTarget = {
  kind: 'telegram' | 'external';
  url: string;
};

// Открываем только то, что реально ведёт в браузер/телеграм. support_url приходит
// из админского SUPPORT_USERNAME — чужую схему (`javascript:`, `data:` и т.п.)
// нельзя пускать в опенер как есть.
const ALLOWED_SCHEMES = ['http:', 'https:', 'tg:'];

function isAllowedScheme(url: string): boolean {
  try {
    return ALLOWED_SCHEMES.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * Резолвит контакт поддержки из конфига.
 *
 * SUPPORT_USERNAME на бэке принимает и `@username`, и произвольный URL, поэтому
 * бэк отдаёт уже разрезолвленные `support_url` + `contact_is_telegram`. Клиент
 * раньше склеивал `https://t.me/${support_username}` — на внешнем хелпдеске это
 * давало `https://t.me/https://help.example.com`, и ссылка не открывалась.
 *
 * Старый бэк не отдаёт `support_url`; для него сохранено прежнее поведение,
 * иначе новый фронт сломался бы на неподнятом бэкенде.
 *
 * Возвращает `null`, когда открывать нечего (пустой/битый конфиг, чужая схема,
 * URL-образный legacy username) — вызывающий в этом случае не рендерит кнопку,
 * а не уводит пользователя по мусорной ссылке.
 */
export function resolveSupportContact(config: SupportConfig): SupportContactTarget | null {
  const serverUrl = config.support_url?.trim();

  if (serverUrl) {
    if (!isAllowedScheme(serverUrl)) return null;

    // contact_is_telegram отсутствует только у старого бэка, а он не шлёт и
    // support_url — так что явная проверка на false, а не на truthy.
    const kind = config.contact_is_telegram === false ? 'external' : 'telegram';
    return { kind, url: serverUrl };
  }

  const raw = config.support_username?.trim();
  if (!raw) return null;

  const username = raw.startsWith('@') ? raw.slice(1) : raw;

  // Legacy-путь: голый URL здесь дал бы `t.me/https://…`, поэтому клеим t.me
  // только из настоящего юзернейма — всё URL-образное отдаём резолвить бэку.
  if (!/^[A-Za-z0-9_]{3,}$/.test(username)) return null;

  return { kind: 'telegram', url: `https://t.me/${username}` };
}
