import DOMPurify from 'dompurify';

/** Count the plain text of a Telegram HTML caption, without a raw HTML sink. */
export function telegramCaptionLength(message: string): number {
  const fragment = DOMPurify.sanitize(message.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    // Keep text even in unsupported tags; the backend validates Telegram markup.
    FORBID_CONTENTS: [],
    FORCE_BODY: true,
    RETURN_DOM_FRAGMENT: true,
  });
  return Array.from(fragment.textContent ?? '').length;
}
