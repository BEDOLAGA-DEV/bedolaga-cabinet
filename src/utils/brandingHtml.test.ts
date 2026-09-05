import { describe, expect, it } from 'vitest';
import htmlSource from '../../index.html?raw';
import {
  BRANDING_PLACEHOLDERS,
  DEFAULT_API_URL,
  DEFAULT_APP_NAME,
  renderBrandingHtml,
} from '../../vite-plugins/brandingHtml';
import { letterFaviconDataUri } from './favicon';

/**
 * index.html получает имя и иконку бренда из VITE_APP_NAME / VITE_APP_LOGO на
 * сборке. До этого в разметке были зашиты «VPN» и монограмма «V», и переменные
 * до вкладки и ярлыков не доходили.
 */
describe('brandingHtml', () => {
  it('index.html содержит плейсхолдеры имени и иконки', () => {
    expect(htmlSource).toContain(`<title>${BRANDING_PLACEHOLDERS.name}</title>`);
    expect(htmlSource).toContain(`content="${BRANDING_PLACEHOLDERS.name}"`);
    expect(htmlSource).toContain(`href="${BRANDING_PLACEHOLDERS.icon}"`);
    // Значения из сборки не должны оставаться в разметке буквально.
    expect(htmlSource).not.toContain('<title>VPN</title>');
  });

  it('подставляет экранированное имя и монограмму первой буквы', () => {
    const html = renderBrandingHtml(htmlSource, { name: 'Zero "Ping" & Co', logo: '' });
    expect(html).not.toContain(BRANDING_PLACEHOLDERS.name);
    expect(html).not.toContain(BRANDING_PLACEHOLDERS.icon);
    expect(html).toContain('<title>Zero &quot;Ping&quot; &amp; Co</title>');
    // Логотип не задан — берётся первая буква имени, тем же генератором, что и в рантайме.
    expect(html).toContain(`href="${letterFaviconDataUri('Z')}"`);
  });

  it('пустые переменные дают нейтральный дефолт', () => {
    const html = renderBrandingHtml(htmlSource, { name: '   ', logo: '' });
    expect(html).toContain(`<title>${DEFAULT_APP_NAME}</title>`);
    expect(html).toContain(`href="${letterFaviconDataUri(DEFAULT_APP_NAME)}"`);
  });

  it('VITE_APP_LOGO задаёт букву монограммы', () => {
    const html = renderBrandingHtml(htmlSource, { name: 'ZeroPing', logo: 'zp' });
    expect(html).toContain(`href="${letterFaviconDataUri('Z')}"`);
  });

  // Инлайн-скрипт запрашивает /cabinet/branding до загрузки бандла и должен
  // знать адрес API — тот же VITE_API_URL, что зашивается в JS.
  it('подставляет адрес API в инлайн-скрипт, по умолчанию /api', () => {
    expect(htmlSource).toContain(`var API = '${BRANDING_PLACEHOLDERS.apiUrl}';`);

    const withDefault = renderBrandingHtml(htmlSource, { name: 'X', logo: '' });
    expect(withDefault).toContain(`var API = '${DEFAULT_API_URL}';`);
    expect(withDefault).not.toContain(BRANDING_PLACEHOLDERS.apiUrl);

    const withUrl = renderBrandingHtml(htmlSource, {
      name: 'X',
      logo: '',
      apiUrl: 'https://api.example.com',
    });
    expect(withUrl).toContain("var API = 'https://api.example.com';");
  });

  it('экранирует адрес API как JS-строку, чтобы не сломать скрипт', () => {
    const html = renderBrandingHtml(htmlSource, {
      name: 'X',
      logo: '',
      apiUrl: "/api'; alert(1); '</script>",
    });
    expect(html).toContain("var API = '/api\\'; alert(1); \\'\\x3C/script>';");
    expect(html).not.toContain("alert(1); '</script>");
  });
});
