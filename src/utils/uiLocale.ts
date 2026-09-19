import i18next from 'i18next';

const LOCALE_MAP: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  zh: 'zh-CN',
  fa: 'fa-IR',
};

/**
 * BCP-47 тег активного языка интерфейса для toLocale*-методов и Intl-API.
 * Без него даты/числа форматируются локалью браузера (или жёстким 'ru-RU')
 * и не реагируют на смену языка в приложении.
 */
export function uiLocale(): string {
  const lang = (i18next.language || '').split('-')[0];
  return LOCALE_MAP[lang] || 'ru-RU';
}
