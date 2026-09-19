/**
 * Предзаполнение поля контакта на странице быстрой покупки.
 *
 * Персональную ссылку вида `/buy/slug?contact=@username` формирует бот или
 * Happ, чтобы клиенту не пришлось вводить контакт вручную.
 */

const CONTACT_PARAM = 'contact';

/**
 * Контакт для формы: сначала параметр URL, иначе последнее введённое значение.
 */
export function readContactPrefill(storageKey: string): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(CONTACT_PARAM);
    return fromUrl || localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}

/**
 * Убирает `contact` из адресной строки, сохраняя остальные параметры.
 *
 * Вызывать сразу после чтения. В параметре лежит личный email или @username, а
 * лендинг инициализирует Яндекс.Метрику (та пишет URL страницы, а с
 * `webvisor` — ещё и запись сессии). Без очистки контакт уезжает в аналитику,
 * в `Referer` при переходе на оплату, в историю браузера и в логи. Тот же приём
 * применяет `captureCampaignFromUrl()`.
 */
export function stripContactFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has(CONTACT_PARAM)) return;

    params.delete(CONTACT_PARAM);
    const search = params.toString();
    const url = window.location.pathname + (search ? `?${search}` : '') + window.location.hash;
    window.history.replaceState(null, '', url);
  } catch {}
}
