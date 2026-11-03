import DOMPurify from 'dompurify';

/** Match the backend's tag stripping and code-point count, without a raw HTML sink. */
export function telegramCaptionLength(message: string): number {
  // Stripping tags is only a counting rule, not a security boundary. Escape every
  // remaining opener before decoding entities, including malformed nested tags.
  const text = message
    .trim()
    .replace(/<[^<>]+>/g, '')
    .replace(/</g, '&lt;');
  const fragment = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    RETURN_DOM_FRAGMENT: true,
  });
  return Array.from(fragment.textContent ?? '').length;
}
