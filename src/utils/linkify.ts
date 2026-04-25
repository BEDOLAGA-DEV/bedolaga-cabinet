import DOMPurify from 'dompurify';

/**
 * Match http(s) URLs but exclude common trailing punctuation that is unlikely
 * to be part of the URL itself (e.g. the period at the end of a sentence,
 * or a closing bracket / quote that wraps the URL).
 */
const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?\])}"'])/g;

/**
 * Linkify plain text by wrapping http(s) URLs in <a> tags.
 * Returns an HTML string sanitized via DOMPurify with a strict allowlist
 * (only <a> + <br>), safe to render in the UI.
 *
 * Trailing punctuation (.,;:!?)]}"') is excluded from the URL match so a
 * sentence like `Visit https://example.com.` does not capture the period.
 */
export function linkifyText(text: string | null | undefined): string {
  if (!text) return '';
  const replaced = text.replace(
    URL_REGEX,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return DOMPurify.sanitize(replaced, {
    ALLOWED_TAGS: ['a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}
