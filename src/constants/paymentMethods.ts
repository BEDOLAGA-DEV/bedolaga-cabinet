import type { TFunction } from 'i18next';

export const METHOD_LABELS: Record<string, string> = {
  telegram_stars: 'Telegram Stars',
  tribute: 'Tribute',
  cryptobot: 'CryptoBot',
  heleket: 'Heleket',
  yookassa: 'YooKassa',
  mulenpay: 'MulenPay',
  pal24: 'PayPalych',
  platega: 'Platega',
  platega_recurrent: 'Platega СБП',
  wata: 'WATA',
  freekassa: 'Freekassa',
  freekassa_sbp: 'Freekassa СБП',
  freekassa_card: 'Freekassa Карта',
  cloudpayments: 'CloudPayments',
  kassa_ai: 'Kassa AI',
  riopay: 'RioPay',
  severpay: 'SeverPay',
  rollypay: 'RollyPay',
  aurapay: 'AuraPay',
  overpay: 'OverPay',
  etoplatezhi: 'Etoplatezhi',
  antilopay: 'Antilopay',
  jupiter: 'Jupiter',
  cispay: 'CisPay',
  cashera: 'Cashera',
  tabpay: 'TabPay',
  anore: 'Anore',
  paritypay: 'ParityPay',
  donut: 'Donut',
  lava: 'Lava',
  apple_iap: 'Apple In-App Purchase',
  manual: 'Ручное пополнение',
};

const METHOD_TRANSLATION_KEYS: Record<string, string> = {
  platega_recurrent: 'common.paymentMethods.plategaRecurrent',
  freekassa_sbp: 'common.paymentMethods.freekassaSbp',
  freekassa_card: 'common.paymentMethods.freekassaCard',
  manual: 'common.paymentMethods.manual',
};

/** Localize descriptive labels; provider brands and unknown IDs stay unchanged. */
export function getPaymentMethodLabel(method: string, t: TFunction): string | undefined {
  const key = METHOD_TRANSLATION_KEYS[method];
  return key ? t(key) : METHOD_LABELS[method];
}
