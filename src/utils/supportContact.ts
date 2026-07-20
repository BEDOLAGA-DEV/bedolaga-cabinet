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
 */
export function resolveSupportContact(config: SupportConfig): SupportContactTarget {
  if (config.support_url) {
    // contact_is_telegram отсутствует только у старого бэка, а он не шлёт и
    // support_url — так что явная проверка на false, а не на truthy.
    const kind = config.contact_is_telegram === false ? 'external' : 'telegram';
    return { kind, url: config.support_url };
  }

  const raw = config.support_username || '@support';
  const username = raw.startsWith('@') ? raw.slice(1) : raw;

  return { kind: 'telegram', url: `https://t.me/${username}` };
}
