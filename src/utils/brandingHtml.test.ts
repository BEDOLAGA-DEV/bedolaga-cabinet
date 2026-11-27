import { describe, expect, it } from 'vitest';
import htmlSource from '../../index.html?raw';
import {
  BRANDING_PLACEHOLDERS,
  DEFAULT_API_URL,
  DEFAULT_APP_NAME,
  FAVICON_PATH,
  MANIFEST_PATH,
  renderBrandingHtml,
} from '../../vite-plugins/brandingHtml';

/**
 * index.html получает имя бренда из VITE_APP_NAME на сборке, фавикон — ссылкой
 * на эндпоинт бота, адрес API — в инлайн-скрипт. До этого в разметке были
 * зашиты «VPN» и монограмма «V», и переменные до вкладки и ярлыков не доходили;
 * а монограмма из сборки в Safari оставалась навсегда, потому что Safari не
 * замечает смену фавикона через JS.
 */
describe('brandingHtml', () => {
  it('index.html содержит плейсхолдеры имени и адреса API', () => {
    expect(htmlSource).toContain(`<title>${BRANDING_PLACEHOLDERS.name}</title>`);
    expect(htmlSource).toContain(`content="${BRANDING_PLACEHOLDERS.name}"`);
    expect(htmlSource).toContain(
      `<link rel="manifest" href="${BRANDING_PLACEHOLDERS.manifest}" />`,
    );
    expect(htmlSource).toContain(`var API = '${BRANDING_PLACEHOLDERS.apiUrl}';`);
    // Значения из сборки не должны оставаться в разметке буквально.
    expect(htmlSource).not.toContain('<title>VPN</title>');
  });

  it('подставляет экранированное имя', () => {
    const html = renderBrandingHtml(htmlSource, { name: 'Zero "Ping" & Co' });
    expect(html).not.toContain(BRANDING_PLACEHOLDERS.name);
    expect(html).toContain('<title>Zero &quot;Ping&quot; &amp; Co</title>');
  });

  it('пустое имя даёт нейтральный дефолт', () => {
    const html = renderBrandingHtml(htmlSource, { name: '   ' });
    expect(html).toContain(`<title>${DEFAULT_APP_NAME}</title>`);
  });

  // Иконки захардкожены — те же файлы, что на лендинге, и с бота не берутся.
  it('фавикон и apple-touch-icon — статические файлы лендинга', () => {
    const html = renderBrandingHtml(htmlSource, { name: 'ZeroPing' });
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />');
    expect(html).not.toMatch(new RegExp(`<link rel="icon"[^>]*${FAVICON_PATH}`));
    expect(html).not.toContain(BRANDING_PLACEHOLDERS.icon);
  });

  // Chrome на Android собирает приложение на серверах Google: манифест и иконки
  // им нужны по адресам. Из data: URI вместо приложения ставился ярлык во вкладке.
  it('манифест — ссылка на /cabinet/branding/manifest.webmanifest у бота', () => {
    const html = renderBrandingHtml(htmlSource, { name: 'ZeroPing' });
    expect(html).toContain(`<link rel="manifest" href="${DEFAULT_API_URL}${MANIFEST_PATH}" />`);
    expect(html).not.toContain(BRANDING_PLACEHOLDERS.manifest);

    const external = renderBrandingHtml(htmlSource, {
      name: 'X',
      apiUrl: 'https://api.example/',
    });
    expect(external).toContain(
      '<link rel="manifest" href="https://api.example/cabinet/branding/manifest.webmanifest" />',
    );
  });

  it('подставляет адрес API в инлайн-скрипт, по умолчанию /api', () => {
    const withDefault = renderBrandingHtml(htmlSource, { name: 'X' });
    expect(withDefault).toContain(`var API = '${DEFAULT_API_URL}';`);
    expect(withDefault).not.toContain(BRANDING_PLACEHOLDERS.apiUrl);

    const withUrl = renderBrandingHtml(htmlSource, {
      name: 'X',
      apiUrl: 'https://api.example.com',
    });
    expect(withUrl).toContain("var API = 'https://api.example.com';");
  });

  it('экранирует адрес API как JS-строку, чтобы не сломать скрипт', () => {
    const html = renderBrandingHtml(htmlSource, {
      name: 'X',
      apiUrl: "/api'; alert(1); '</script>",
    });
    expect(html).toContain("var API = '/api\\'; alert(1); \\'\\x3C/script>';");
    expect(html).not.toContain("alert(1); '</script>");
  });
});
