import { useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface PreviewButton {
  text: string;
  url?: string;
  callback_data?: string;
}

interface TelegramPreviewProps {
  open: boolean;
  onClose: () => void;
  text: string;
  mediaUrl?: string | null;
  mediaType?: 'photo' | 'video' | null;
  buttons?: PreviewButton[][];
}

interface EmailPreviewProps {
  open: boolean;
  onClose: () => void;
  subject: string;
  htmlContent: string;
}

interface Token {
  kind: 'text' | 'open' | 'close' | 'br';
  tag?: string;
  href?: string;
  value?: string;
}

const TG_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'ins',
  's',
  'strike',
  'del',
  'code',
  'pre',
  'a',
  'tg-spoiler',
  'span',
]);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /<(\/?)([a-z][a-z0-9-]*)(\s+[^>]*)?>|<br\s*\/?>/gi;
  const matches = [...input.matchAll(pattern)];
  let lastIdx = 0;
  for (const m of matches) {
    const idx = m.index || 0;
    if (idx > lastIdx) tokens.push({ kind: 'text', value: input.slice(lastIdx, idx) });
    if (m[0].toLowerCase().startsWith('<br')) {
      tokens.push({ kind: 'br' });
    } else {
      const isClose = m[1] === '/';
      const tag = m[2].toLowerCase();
      if (!TG_TAGS.has(tag)) {
        tokens.push({ kind: 'text', value: m[0] });
      } else if (isClose) {
        tokens.push({ kind: 'close', tag });
      } else {
        let href: string | undefined;
        if (tag === 'a' && m[3]) {
          const hrefMatch = m[3].match(/href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i);
          href = hrefMatch ? hrefMatch[1] || hrefMatch[2] : undefined;
        }
        tokens.push({ kind: 'open', tag, href });
      }
    }
    lastIdx = idx + m[0].length;
  }
  if (lastIdx < input.length) tokens.push({ kind: 'text', value: input.slice(lastIdx) });
  return tokens;
}

function renderText(value: string, key: number): ReactNode {
  const parts = value.split(/\n/);
  return parts.flatMap((p, i) => (i === 0 ? [p] : [<br key={`nl-${key}-${i}`} />, p]));
}

type Frame = { tag: string | null; href?: string; children: ReactNode[] };

function wrap(frame: Frame, key: number): ReactNode {
  const k = `el-${key}`;
  switch (frame.tag) {
    case 'b':
    case 'strong':
      return <b key={k}>{frame.children}</b>;
    case 'i':
    case 'em':
      return <i key={k}>{frame.children}</i>;
    case 'u':
    case 'ins':
      return <u key={k}>{frame.children}</u>;
    case 's':
    case 'strike':
    case 'del':
      return <s key={k}>{frame.children}</s>;
    case 'code':
      return (
        <code key={k} className="rounded bg-black/30 px-1 font-mono text-[0.92em]">
          {frame.children}
        </code>
      );
    case 'pre':
      return (
        <pre key={k} className="my-1 rounded bg-black/30 p-2 font-mono text-[0.92em]">
          {frame.children}
        </pre>
      );
    case 'a': {
      const safeHref =
        frame.href && /^(https?:|tg:|mailto:|tel:)/i.test(frame.href) ? frame.href : '#';
      return (
        <a
          key={k}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          {frame.children}
        </a>
      );
    }
    case 'tg-spoiler':
    case 'span':
      return <span key={k}>{frame.children}</span>;
    default:
      return <span key={k}>{frame.children}</span>;
  }
}

function tokensToReact(tokens: Token[]): ReactNode {
  const root: Frame = { tag: null, children: [] };
  const stack: Frame[] = [root];
  let textKey = 0;
  let elKey = 0;
  for (const tok of tokens) {
    const top = stack[stack.length - 1];
    if (tok.kind === 'text') {
      top.children.push(<span key={`t-${textKey++}`}>{renderText(tok.value || '', textKey)}</span>);
    } else if (tok.kind === 'br') {
      top.children.push(<br key={`br-${elKey++}`} />);
    } else if (tok.kind === 'open') {
      stack.push({ tag: tok.tag!, href: tok.href, children: [] });
    } else if (tok.kind === 'close') {
      let foundIdx = -1;
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tag === tok.tag) {
          foundIdx = i;
          break;
        }
      }
      if (foundIdx === -1) continue;
      while (stack.length > foundIdx) {
        const closed = stack.pop()!;
        const parent = stack[stack.length - 1] || root;
        parent.children.push(wrap(closed, elKey++));
      }
    }
  }
  while (stack.length > 1) {
    const closed = stack.pop()!;
    const parent = stack[stack.length - 1];
    parent.children.push(wrap(closed, elKey++));
  }
  return root.children;
}

export function TelegramPreview({
  open,
  onClose,
  text,
  mediaUrl,
  mediaType,
  buttons,
}: TelegramPreviewProps) {
  const { t } = useTranslation();
  const rendered = useMemo(() => tokensToReact(tokenize(text)), [text]);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#17212b] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            {t('admin.broadcasts.preview', 'Предпросмотр Telegram')}
          </h3>
          <button onClick={onClose} className="rounded p-1 text-dark-400 hover:bg-dark-700">
            ✕
          </button>
        </div>
        <div className="rounded-xl bg-[#0e1621] p-3">
          <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-[#2b5278] p-3 text-white shadow">
            {mediaUrl && mediaType === 'photo' && (
              <img src={mediaUrl} alt="" className="mb-2 max-h-72 w-full rounded-lg object-cover" />
            )}
            {mediaUrl && mediaType === 'video' && (
              <video src={mediaUrl} controls className="mb-2 max-h-72 w-full rounded-lg" />
            )}
            {text ? (
              <div className="whitespace-pre-wrap break-words text-[15px] leading-snug">
                {rendered}
              </div>
            ) : (
              <div className="text-sm italic text-white/60">
                {t('admin.broadcasts.previewEmpty', '— пусто —')}
              </div>
            )}
          </div>
          {buttons && buttons.length > 0 && (
            <div className="mt-2 space-y-1">
              {buttons.map((row, ri) => (
                <div key={ri} className="flex gap-1">
                  {row.map((b, ci) => (
                    <button
                      key={ci}
                      type="button"
                      className="flex-1 rounded-md bg-[#1f2c3a] px-3 py-2 text-sm text-blue-300 hover:bg-[#26384a]"
                    >
                      {b.text}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function EmailPreview({ open, onClose, subject, htmlContent }: EmailPreviewProps) {
  const { t } = useTranslation();
  if (!open) return null;
  const emptyHtml = `<p style="color:#999;font-family:sans-serif">${t('admin.broadcasts.previewEmpty', '— пусто —')}</p>`;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-gray-400">
              {t('admin.broadcasts.emailSubject', 'Тема')}
            </div>
            <div className="truncate text-base font-semibold text-gray-900">
              {subject || t('admin.broadcasts.previewEmpty', '— пусто —')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <iframe
          title="email preview"
          className="w-full flex-1 bg-white"
          sandbox=""
          srcDoc={htmlContent || emptyHtml}
        />
      </div>
    </div>,
    document.body,
  );
}
