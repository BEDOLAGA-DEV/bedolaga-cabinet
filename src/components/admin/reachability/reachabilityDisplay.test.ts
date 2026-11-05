import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import en from '../../../locales/en.json';
import fa from '../../../locales/fa.json';
import ru from '../../../locales/ru.json';
import zh from '../../../locales/zh.json';
import {
  getReachabilityErrorMessage,
  localizeReachabilityText,
  REACHABILITY_LITERAL_KEYS,
} from './reachabilityDisplay';

const dynamicCases = [
  ['Подписка истекла 31.12.2030', 'expiredOn', { date: '31.12.2030' }],
  ['Трафик подписки исчерпан: 1.5 из 2 ГБ', 'trafficUsed', { used: '1.5', total: '2' }],
  [
    'Панель отдала вместо серверов заглушку: «Operator <text> & custom»',
    'stub',
    { remarks: '«Operator <text> & custom»' },
  ],
  [
    'Панель отдала вместо серверов заглушку: «Custom» — даже на запрос с привязкой устройства: похоже, у подписки исчерпан лимит устройств или панель не пускает наше приложение',
    'deviceStub',
    { remarks: '«Custom»' },
  ],
  ['Слишком много городов для этого режима', 'tooManyCities', {}],
  [
    'Слишком много городов для этого режима: сервис предлагает потолок 5 городов',
    'cityLimit',
    { countValue: '5' },
  ],
  ['Слишком часто: сервис просит повторить', 'rateLimited', {}],
  ['Слишком часто: сервис просит повторить через 12 с', 'retryAfter', { seconds: '12' }],
  [
    'Город не найден в справочнике сервиса: Custom <city>',
    'unknownCity',
    { details: ': Custom <city>' },
  ],
  ['Регион не найден в справочнике сервиса', 'unknownRegion', { details: '' }],
  ['Округ не найден в справочнике сервиса: Custom', 'unknownDistrict', { details: ': Custom' }],
  ['Провайдер не найден в справочнике сервиса: ISP', 'unknownIsp', { details: ': ISP' }],
  [
    'Сервис не смог развернуть подписку: Provider <raw>\ntext',
    'resolveFailed',
    { details: 'Provider <raw>\ntext' },
  ],
] as const;

for (const [language, resource] of Object.entries({ ru, en, zh, fa })) {
  describe(language, () => {
    const instance = createInstance();
    void instance.init({
      lng: language,
      resources: { [language]: { translation: resource } },
      initAsync: false,
      interpolation: { escapeValue: false },
    });
    const t = instance.t.bind(instance);
    it.each(REACHABILITY_LITERAL_KEYS)('localizes exact own literal %s', (raw, suffix) => {
      const key = `admin.reachability.messages.${suffix}`;
      expect(instance.exists(key)).toBe(true);
      expect(localizeReachabilityText(raw, t)).toBe(t(key));
    });
    it.each(dynamicCases)(
      'localizes own format and preserves parameters %s',
      (raw, suffix, params) => {
        const key = `admin.reachability.messages.${suffix}`;
        expect(instance.exists(key)).toBe(true);
        expect(localizeReachabilityText(raw, t)).toBe(t(key, params));
      },
    );
    it('preserves unknown diagnostics and shared response object', () => {
      for (const raw of [
        'Provider custom error',
        'Пользовательский текст панели',
        'Подписка истекла whenever',
        '<b>Operator</b>',
        'Город не найден где-то',
        'prefix Подписка истекла',
      ]) {
        expect(localizeReachabilityText(raw, t)).toBe(raw);
      }
      const error = Object.freeze({
        isAxiosError: true,
        response: Object.freeze({ data: Object.freeze({ detail: 'Подписка истекла 31.12.2030' }) }),
      });
      expect(getReachabilityErrorMessage(error, 'fallback', t)).toBe(
        t('admin.reachability.messages.expiredOn', { date: '31.12.2030' }),
      );
      expect(error.response.data.detail).toBe('Подписка истекла 31.12.2030');
      expect(
        getReachabilityErrorMessage(
          { isAxiosError: true, response: { data: { detail: 'Unknown provider' } } },
          '',
          t,
        ),
      ).toBe('Unknown provider');
    });
  });
}
