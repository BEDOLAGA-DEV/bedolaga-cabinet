import { useEffect } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';

import { infoApi } from '../api/info';

type DocType = 'privacy' | 'offer' | 'recurrent';

const DOC_META: Record<
  DocType,
  {
    title: string;
    queryKey: string;
    fetcher: () => Promise<{ content: string; updated_at: string | null }>;
  }
> = {
  privacy: {
    title: 'Политика конфиденциальности',
    queryKey: 'public-privacy-policy',
    fetcher: () => infoApi.getPrivacyPolicy(),
  },
  offer: {
    title: 'Публичная оферта',
    queryKey: 'public-offer',
    fetcher: () => infoApi.getPublicOffer(),
  },
  recurrent: {
    title: 'Соглашение о рекуррентных платежах',
    queryKey: 'public-recurrent-payments',
    fetcher: () => infoApi.getRecurrentPaymentsAgreement(),
  },
};

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'h1',
    'h2',
    'h3',
    'h4',
    'b',
    'strong',
    'i',
    'em',
    'u',
    'code',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

const formatContent = (content: string): string => {
  if (!content) return '';

  const hasBlockHtml = /<(p|div|h[1-6]|ul|ol|blockquote)\b/i.test(content);
  if (hasBlockHtml) return DOMPurify.sanitize(content, SANITIZE_CONFIG);

  const result = content
    .split(/\n\n+/)
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';

      if (/^#{1,4}\s/.test(trimmed)) {
        const level = trimmed.match(/^(#{1,4})/)?.[1].length || 1;
        const text = trimmed.replace(/^#{1,4}\s*/, '');
        return `<h${level}>${text}</h${level}>`;
      }

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

      const formatted = trimmed.split('\n').join('<br/>');
      return `<p>${formatted}</p>`;
    })
    .filter(Boolean)
    .join('');

  return DOMPurify.sanitize(result, SANITIZE_CONFIG);
};

function PublicLegalDocInternal({ docType }: { docType: DocType }) {
  const meta = DOC_META[docType];

  const { data, isLoading, isError } = useQuery({
    queryKey: [meta.queryKey],
    queryFn: meta.fetcher,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    document.title = `${meta.title} — Matrixxx VPN`;
  }, [meta.title]);

  const updatedAt = data?.updated_at ? new Date(data.updated_at).toLocaleDateString('ru-RU') : null;
  const html = data?.content ? formatContent(data.content) : '';

  return (
    <div className="min-h-screen bg-dark-950 px-4 py-8 text-dark-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-accent-400 transition-colors hover:text-accent-300"
        >
          ← Matrixxx VPN
        </Link>

        <h1 className="mt-6 flex items-center gap-2 text-3xl font-bold text-white">{meta.title}</h1>

        {updatedAt && <p className="mt-2 text-sm text-dark-400">Обновлено: {updatedAt}</p>}

        <div className="mt-8">
          {isLoading && (
            <div className="bento-card flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          )}
          {isError && (
            <div className="bento-card text-center text-red-400">
              Не удалось загрузить документ.
            </div>
          )}
          {html && (
            <div className="bento-card prose prose-invert max-w-none">
              <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          )}
        </div>

        <div className="mt-12 text-center text-xs text-dark-500">
          <p>
            Smedia Pro LTD · Reg. No. 15645745
            <br />7 Bell Yard, London, UK, WC2A 2JR
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicLegalDocInternal;

export function PublicPrivacyPage() {
  return <PublicLegalDocInternal docType="privacy" />;
}

export function PublicOfferPage() {
  return <PublicLegalDocInternal docType="offer" />;
}

export function PublicRecurrentPaymentsPage() {
  return <PublicLegalDocInternal docType="recurrent" />;
}
