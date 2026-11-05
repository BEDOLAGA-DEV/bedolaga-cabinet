import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import ru from '../locales/ru.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import fa from '../locales/fa.json';
import { getPaymentMethodLabel } from './paymentMethods';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
  zh: { translation: zh },
  fa: { translation: fa },
};

describe('payment method labels', () => {
  it.each([
    ['ru', 'Ручное пополнение', 'Freekassa Карта'],
    ['en', 'Manual top-up', 'Freekassa card'],
    ['zh', '手动充值', 'Freekassa 银行卡'],
    ['fa', 'شارژ دستی', 'کارت Freekassa'],
  ])('uses %s while preserving provider identifiers', async (language, manual, card) => {
    const i18n = createInstance();
    await i18n.init({ lng: language, resources });
    expect(getPaymentMethodLabel('manual', i18n.t)).toBe(manual);
    expect(getPaymentMethodLabel('freekassa_card', i18n.t)).toBe(card);
    expect(getPaymentMethodLabel('cispay', i18n.t)).toBe('CisPay');
    expect(getPaymentMethodLabel('unknown-provider', i18n.t)).toBeUndefined();
  });
});
