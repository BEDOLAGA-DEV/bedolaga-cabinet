import type { TFunction } from 'i18next';
import { getLocalizedApiErrorMessage } from '@/utils/api-error-display';

/** Only first-party notes.py / geo_messages.py wording, at the display boundary. */
export const REACHABILITY_LITERAL_KEYS = [
  ['Подписка истекла', 'expired'],
  ['Подписка отключена в панели', 'disabled'],
  ['Трафик подписки исчерпан', 'exhausted'],
  ['По этому адресу страница, а не подписка', 'htmlPage'],
  ['В подписке нет ни одного сервера', 'noServers'],
  ['GEO проверяет не больше 20 целей за запуск', 'tooManyTargets'],
  ['На балансе bschekbot не хватает кредитов на резерв этой проверки', 'insufficientCredits'],
  ['Эта проверка недоступна на текущем тарифе bschekbot: GEO открыт с тарифа Bronze', 'tierTooLow'],
  ['Эта проверка доступна только на платном тарифе bschekbot', 'paidOnly'],
  ['Проверка недоступна для этого ключа API bschekbot', 'apiUnavailable'],
  ['Порт цели запрещён у сервиса, проверка не запущена (денег не стоит)', 'portForbidden'],
  ['«Тяжёлой» пробе нужна хотя бы одна доменная цель', 'domainRequired'],
  ['Под этот охват у сервиса нет ни одного города', 'noCities'],
  ['У сервиса уже идут три прогона этого аккаунта — ждём и повторяем', 'activeLimit'],
  ['Сервис на обслуживании — повторяем позже', 'maintenance'],
  ['Справочник городов сервиса недоступен, повторите позже', 'catalogUnavailable'],
  ['Прогон уже завершён — останавливать нечего', 'alreadyFinished'],
  ['Прогон оборван на стороне сервиса, он закроет его сам', 'cannotCancel'],
] as const;

const literalKeys = new Map<string, string>(REACHABILITY_LITERAL_KEYS);
const base = 'admin.reachability.messages';
const stubPrefix = 'Панель отдала вместо серверов заглушку: ';
const deviceSuffix =
  ' — даже на запрос с привязкой устройства: похоже, у подписки исчерпан лимит устройств или панель не пускает наше приложение';

/** Does not alter the source object, cache, statuses, operator remarks or provider payloads. */
export function localizeReachabilityText(raw: string, t: TFunction): string {
  const key = literalKeys.get(raw);
  if (key) return t(`${base}.${key}`, { defaultValue: raw });
  let match = /^Подписка истекла (\d{2}\.\d{2}\.\d{4})$/.exec(raw);
  if (match) return t(`${base}.expiredOn`, { date: match[1], defaultValue: raw });
  match = /^Трафик подписки исчерпан: (\d+(?:\.\d+)?) из (\d+(?:\.\d+)?) ГБ$/.exec(raw);
  if (match)
    return t(`${base}.trafficUsed`, { used: match[1], total: match[2], defaultValue: raw });
  if (raw.startsWith(stubPrefix)) {
    const hasDeviceSuffix = raw.endsWith(deviceSuffix);
    const remarks = raw.slice(
      stubPrefix.length,
      hasDeviceSuffix ? -deviceSuffix.length : undefined,
    );
    // notes.py surrounds operator remarks with guillemets. Keep their content intact.
    if (remarks.startsWith('«') && remarks.endsWith('»')) {
      return t(`${base}.${hasDeviceSuffix ? 'deviceStub' : 'stub'}`, {
        remarks,
        defaultValue: raw,
      });
    }
  }
  match =
    /^Слишком много городов для этого режима(?:: сервис предлагает потолок (\d+) городов)?$/.exec(
      raw,
    );
  if (match)
    return t(`${base}.${match[1] ? 'cityLimit' : 'tooManyCities'}`, {
      countValue: match[1],
      defaultValue: raw,
    });
  match = /^Слишком часто: сервис просит повторить(?: через (\d+) с)?$/.exec(raw);
  if (match)
    return t(`${base}.${match[1] ? 'retryAfter' : 'rateLimited'}`, {
      seconds: match[1],
      defaultValue: raw,
    });
  const unknownKinds: Record<string, string> = {
    Город: 'unknownCity',
    Регион: 'unknownRegion',
    Округ: 'unknownDistrict',
    Провайдер: 'unknownIsp',
  };
  match = /^(Город|Регион|Округ|Провайдер) не найден в справочнике сервиса(: [\s\S]+)?$/.exec(raw);
  if (match)
    return t(`${base}.${unknownKinds[match[1]]}`, { details: match[2] ?? '', defaultValue: raw });
  const resolvePrefix = 'Сервис не смог развернуть подписку: ';
  if (raw.startsWith(resolvePrefix))
    return t(`${base}.resolveFailed`, {
      details: raw.slice(resolvePrefix.length),
      defaultValue: raw,
    });
  return raw;
}

export function getReachabilityErrorMessage(
  error: unknown,
  fallback: string,
  t: TFunction,
): string {
  return localizeReachabilityText(getLocalizedApiErrorMessage(error, fallback, t), t);
}
