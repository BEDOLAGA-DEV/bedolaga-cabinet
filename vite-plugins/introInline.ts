import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/**
 * Встраивает стартовую заставку (src/intro/intro.js) в index.html инлайном.
 *
 * Заставка обязана нарисовать первый кадр до бандла: в Telegram сразу после него
 * уходит web_app_ready, и экран загрузки клиента перетекает в неё. Отдельный
 * <script src> стоил бы ещё одного запроса до первого кадра, поэтому код
 * вставляется в разметку на месте плейсхолдера — и в dev, и в сборке.
 */

export const INTRO_PLACEHOLDER = '<!-- intro -->';

/** Код внутри <script>: `</script` и `<!--` не должны закрыть или сломать тег. */
export function renderIntroHtml(html: string, code: string): string {
  if (!html.includes(INTRO_PLACEHOLDER)) return html;
  const safe = code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  return html.split(INTRO_PLACEHOLDER).join(`<script>\n${safe}\n</script>`);
}

export function introInline(file: string): Plugin {
  return {
    name: 'intro-inline',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Читаем на каждый запрос: в dev правка заставки видна после обновления страницы.
        return renderIntroHtml(html, readFileSync(file, 'utf8'));
      },
    },
  };
}
