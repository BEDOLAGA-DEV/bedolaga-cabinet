import { retrieveRawInitData } from '@telegram-apps/sdk-react';

/**
 * Сырая строка initData Telegram, прочитанная в момент вызова.
 *
 * Почему мало одного `retrieveRawInitData()` из @telegram-apps/sdk: он ищет
 * параметры запуска по цепочке `location.href` → запись performance о навигации
 * → собственный кэш `tapps/launchParams` в sessionStorage, записывая удачный
 * результат обратно в кэш. Последние два источника привязаны не к текущему
 * запуску мини-аппы, а к документу: как только SPA сменила маршрут и hash с
 * `tgWebAppData` ушёл из адреса, остаются запись о навигации исходного
 * документа и кэш — оба из ПЕРВОГО запуска в этой сессии WebView. На iOS такой
 * WebView переживает переоткрытия мини-аппы, и SDK молча отдаёт initData
 * недельной давности, без единой ошибки.
 *
 * Цена — отказ входа: бэкенд принимает initData с `auth_date` не старше 30
 * суток, и застрявшая копия рано или поздно пересекает порог, после чего
 * логин отвечает «Invalid or expired Telegram authentication data».
 *
 * Поэтому спрашиваем ещё и `window.Telegram.WebApp.initData` — его пишет
 * официальный мост Telegram (telegram-web-app.js, подключается в index.html),
 * и он не завязан на кэш SDK. Какой из источников протух, зависит от платформы
 * и способа открытия, поэтому берём не «первый доступный», а тот, у которого
 * `auth_date` больше.
 */
export function getTelegramInitData(): string | null {
  if (typeof window === 'undefined') return null;

  const candidates = [fromTelegramBridge(), fromSdk()].filter((value): value is string =>
    Boolean(value),
  );
  if (candidates.length === 0) return null;

  // При равном или неразобранном auth_date побеждает мост: он ближе к
  // источнику, чем кэш SDK.
  return candidates.reduce((best, candidate) =>
    authDateOf(candidate) > authDateOf(best) ? candidate : best,
  );
}

function fromTelegramBridge(): string | null {
  return window.Telegram?.WebApp?.initData || null;
}

function fromSdk(): string | null {
  try {
    return retrieveRawInitData() || null;
  } catch {
    // Вне Telegram параметров запуска нет — это не ошибка.
    return null;
  }
}

/** Метка времени выдачи initData; 0, если её не удалось разобрать. */
function authDateOf(initData: string): number {
  try {
    const raw = new URLSearchParams(initData).get('auth_date');
    const parsed = Number(raw);
    return raw && Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}
