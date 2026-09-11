import { MAX_CONFIGS_PER_TEST } from './SubscriptionConfigs';

/**
 * Что отметить сразу после разбора поля «Конфиг или подписка». Вставленное вставили, чтобы
 * проверить, — отмечаем всё; но API берёт не больше 20 за тест, а в подписке бывает
 * 10 тысяч серверов: тогда «первые двадцать» были бы случайными — человек выбирает сам.
 */
export function initialSelection(configs: ReadonlyArray<{ index: number }>): number[] {
  if (configs.length > MAX_CONFIGS_PER_TEST) return [];
  return configs.map((config) => config.index);
}
