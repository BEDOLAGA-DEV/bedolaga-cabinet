import DOMPurify from 'dompurify';

// Sanitize HTML content to prevent XSS. Shared by the authenticated Info page and
// the public legal pages (offer / privacy) reachable from the login footer.
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'b',
      'i',
      'u',
      'strong',
      'em',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
      's',
      'del',
      'ins',
      'span',
      'div',
      'tg-spoiler',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'start'],
    ALLOW_DATA_ATTR: false,
  });
};

// Render legal/document content that may be either full block-level HTML or plain
// text with Telegram-style inline tags and newline structure.
export const formatContent = (content: string): string => {
  if (!content) return '';

  // Check if content has block-level HTML (full HTML document)
  const hasBlockHtml = /<(p|div|h[1-6]|ul|ol|blockquote)\b/i.test(content);

  if (hasBlockHtml) {
    return sanitizeHtml(content);
  }

  // Content may have inline Telegram HTML (<b>, <i>, <u>, <code>, <a>) but uses
  // newlines for structure. Convert newlines to paragraphs while preserving inline tags.
  const result = content
    .split(/\n\n+/)
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';

      // Check if it's a markdown header
      if (/^#{1,4}\s/.test(trimmed)) {
        const level = trimmed.match(/^(#{1,4})/)?.[1].length || 1;
        const text = trimmed.replace(/^#{1,4}\s*/, '');
        return `<h${level}>${text}</h${level}>`;
      }

      // Check for list items
      if (/^[-•]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
        const lines = trimmed.split('\n');
        const isOrdered = /^\d+[.)]\s/.test(lines[0]);
        const startNum = isOrdered ? parseInt(lines[0].match(/^(\d+)/)?.[1] || '1', 10) : 1;
        const listItems = lines
          .map((line) => line.replace(/^[-•]\s*/, '').replace(/^\d+[.)]\s*/, ''))
          .filter((line) => line.trim())
          .map((line) => `<li>${line}</li>`)
          .join('');
        return isOrdered ? `<ol start="${startNum}">${listItems}</ol>` : `<ul>${listItems}</ul>`;
      }

      // Regular paragraph — single newlines become <br/>
      const formatted = trimmed.split('\n').join('<br/>');
      return `<p>${formatted}</p>`;
    })
    .filter(Boolean)
    .join('');

  return sanitizeHtml(result);
};
