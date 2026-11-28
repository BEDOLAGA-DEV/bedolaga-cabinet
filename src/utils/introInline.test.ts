import { describe, expect, it } from 'vitest';
import htmlSource from '../../index.html?raw';
import introSource from '../intro/intro.js?raw';
import { INTRO_PLACEHOLDER, renderIntroHtml } from '../../vite-plugins/introInline';

/**
 * Заставка встраивается в index.html инлайном: первый кадр должен появиться до
 * бандла, а в Telegram сразу после него уходит web_app_ready.
 */
describe('introInline', () => {
  it('в index.html ровно одно место под заставку — в <body>, до #root', () => {
    expect(htmlSource.split(INTRO_PLACEHOLDER)).toHaveLength(2);
    const body = htmlSource.slice(htmlSource.indexOf('<body>'));
    expect(body.indexOf(INTRO_PLACEHOLDER)).toBeGreaterThan(-1);
    expect(body.indexOf(INTRO_PLACEHOLDER)).toBeLessThan(body.indexOf('<div id="root">'));
  });

  it('подставляет код в <script> на месте плейсхолдера', () => {
    const html = renderIntroHtml(htmlSource, introSource);
    expect(html).not.toContain(INTRO_PLACEHOLDER);
    expect(html).toContain('<script>\n');
    expect(html).toContain("root.classList.add('bc-intro')");
  });

  it('`</script` и `<!--` в коде не закрывают и не ломают тег', () => {
    const html = renderIntroHtml(`<body>${INTRO_PLACEHOLDER}</body>`, 'a("</script>");b("<!--")');
    expect(html).toBe('<body><script>\na("<\\/script>");b("<\\!--")\n</script></body>');
  });

  it('разметка без плейсхолдера не меняется', () => {
    expect(renderIntroHtml('<body></body>', 'x')).toBe('<body></body>');
  });

  it('код заставки — валидный JS без `</script` внутри', () => {
    expect(() => new Function(introSource)).not.toThrow();
    expect(introSource.toLowerCase()).not.toContain('</script');
  });
});
