import { describe, expect, it } from 'vitest';
import htmlSource from '../../index.html?raw';
import {
  BRANDING_PLACEHOLDERS,
  DEFAULT_API_URL,
  DEFAULT_APP_NAME,
  FAVICON_PATH,
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
  it('index.html содержит плейсхолдеры имени, иконки и адреса API', () => {
    expect(htmlSource).toContain(`<title>${BRANDING_PLACEHOLDERS.name}</title>`);
    expect(htmlSource).toContain(`content="${BRANDING_PLACEHOLDERS.name}"`);
    expect(htmlSource).toContain(`href="${BRANDING_PLACEHOLDERS.icon}"`);
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

  // Safari берёт фавикон только при загрузке страницы: ссылка обязана сразу вести
  // на эндпоинт бота, который отдаёт логотип из админки или монограмму.
  it('фавикон — ссылка на /cabinet/branding/favicon у бота, а не data: URI сборки', () => {
    const html = renderBrandingHtml(htmlSource, { name: 'ZeroPing' });
    expect(html).toContain(`<link rel="icon" href="${DEFAULT_API_URL}${FAVICON_PATH}" />`);
    expect(html).not.toContain(BRANDING_PLACEHOLDERS.icon);
    expect(html).not.toContain('href="data:image/svg+xml');
  });

  // Адрес логотипа фавикону давать нельзя: запрос иконки идёт без Origin, и его
  // ответ без CORS-заголовков из кеша ломает fetch() логотипа в React.
  it('фавикон никогда не ведёт на /cabinet/branding/logo', () => {
    const html = renderBrandingHtml(htmlSource, {
      name: 'ZeroPing',
      apiUrl: 'https://api.example',
    });
    expect(html).toContain(
      '<link rel="icon" href="https://api.example/cabinet/branding/favicon" />',
    );
    expect(html).not.toMatch(/<link rel="icon" href="[^"]*\/cabinet\/branding\/logo"/);
  });

  it('внешний адрес API с хвостовым слэшем даёт чистую ссылку', () => {
    const html = renderBrandingHtml(htmlSource, { name: 'X', apiUrl: 'https://api.example/' });
    expect(html).toContain('href="https://api.example/cabinet/branding/favicon"');
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
