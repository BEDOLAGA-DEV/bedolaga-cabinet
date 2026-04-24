import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { infoPagesApi } from '../api/infoPages';
import { usePlatform } from '../platform/hooks/usePlatform';
import type { FaqItem } from '../api/infoPages';

// Icons
const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

/**
 * Sanitization config — same strict allowlist as NewsArticlePage.
 * All HTML content is sanitized with DOMPurify before rendering.
 */
const ALLOWED_IFRAME_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'www.youtube-nocookie.com',
]);

function isAllowedIframeSrc(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && ALLOWED_IFRAME_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'div',
    'br',
    'hr',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'pre',
    'code',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'a',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'ins',
    'span',
    'mark',
    'sub',
    'sup',
    'small',
    'img',
    'video',
    'iframe',
    'figure',
    'figcaption',
  ],
  ALLOWED_ATTR: [
    'href',
    'target',
    'rel',
    'src',
    'alt',
    'title',
    'width',
    'height',
    'loading',
    'class',
    'start',
    'reversed',
    'type',
    'controls',
    'preload',
    'frameborder',
    'allowfullscreen',
    'allow',
    'sandbox',
    'style',
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
};

/**
 * Isolated DOMPurify instance for info page content sanitization.
 * All user-generated HTML is sanitized before being rendered.
 */
const infoPagePurify = DOMPurify(window);

infoPagePurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    const src = node.getAttribute('src') ?? '';
    if (!isAllowedIframeSrc(src)) {
      node.remove();
      return;
    }
    node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    node.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  }
});

infoPagePurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'VIDEO') {
    const src = node.getAttribute('src') ?? '';
    try {
      const url = new URL(src);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        node.remove();
        return;
      }
    } catch {
      node.remove();
      return;
    }
    node.setAttribute('controls', '');
    node.setAttribute('preload', 'metadata');
  }
});

infoPagePurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

infoPagePurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.hasAttribute('style')) {
    const style = node.getAttribute('style') ?? '';
    const match = style.match(/text-align\s*:\s*(left|center|right|justify)/i);
    if (match) {
      node.setAttribute('style', `text-align: ${match[1]}`);
    } else {
      node.removeAttribute('style');
    }
  }
});

function sanitizeHtml(html: string): string {
  return infoPagePurify.sanitize(html, SANITIZE_CONFIG);
}

// --- FAQ Accordion ---
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`h-5 w-5 text-dark-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const SearchIcon = () => (
  <svg
    className="h-4 w-4 text-dark-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  // Update height when content resizes (images loading, viewport rotation)
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const observer = new ResizeObserver(() => {
      if (contentRef.current) setHeight(contentRef.current.scrollHeight);
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  const sanitizedAnswer = useMemo(() => sanitizeHtml(item.a), [item.a]);

  return (
    <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50 transition-all hover:border-dark-600">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-dark-100 sm:text-base">{item.q}</span>
        <ChevronIcon open={isOpen} />
      </button>
      <div
        style={{ height }}
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
      >
        <div ref={contentRef} className="border-t border-dark-700/50 px-5 pb-4 pt-3">
          <div
            className="prose prose-sm max-w-none text-dark-300"
            dangerouslySetInnerHTML={{ __html: sanitizedAnswer }}
          />
        </div>
      </div>
    </div>
  );
}

function FaqView({ items }: { items: FaqItem[] }) {
  const { t } = useTranslation();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const handleToggle = useCallback((key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const lower = search.toLowerCase();
    return items.filter((item) => item.q.toLowerCase().includes(lower));
  }, [items, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      {items.length > 3 && (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenKey(null);
            }}
            placeholder={t('admin.infoPages.faq.searchPlaceholder')}
            className="input pl-9 text-sm"
          />
        </div>
      )}

      {/* Accordion items */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-6 text-center text-sm text-dark-400">
          {search ? t('admin.infoPages.faq.noResults') : t('admin.infoPages.faq.noQuestions')}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item, index) => {
            const key = `${index}-${item.q.slice(0, 50)}`;
            return (
              <FaqAccordionItem
                key={key}
                item={item}
                isOpen={openKey === key}
                onToggle={() => handleToggle(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InfoPageView() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { capabilities, backButton } = usePlatform();

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!capabilities.hasBackButton) return;
    backButton.show(() => navigateRef.current(-1));
    return () => backButton.hide();
  }, [capabilities.hasBackButton, backButton]);

  const {
    data: page,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['info-pages', 'page', slug],
    queryFn: () => {
      if (!slug) throw new Error('Missing slug parameter');
      return infoPagesApi.getPageBySlug(slug);
    },
    enabled: !!slug,
    staleTime: 60_000,
  });

  const locale = i18n.language.split('-')[0];

  const resolvedTitle = useMemo(() => {
    if (!page) return '';
    return page.title[locale] || page.title['ru'] || page.title['en'] || '';
  }, [page, locale]);

  const isFaq = page?.page_type === 'faq';

  // Parse FAQ items from content
  const faqItems = useMemo((): FaqItem[] => {
    if (!page || !isFaq) return [];
    const raw = page.content[locale] || page.content['ru'] || page.content['en'] || '[]';
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [page, locale, isFaq]);

  // Content is sanitized with DOMPurify before rendering
  const sanitizedContent = useMemo(() => {
    if (!page || isFaq) return '';
    const rawContent = page.content[locale] || page.content['ru'] || page.content['en'] || '';
    return sanitizeHtml(rawContent);
  }, [page, locale, isFaq]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-32 rounded-lg" />
        <div className="skeleton h-10 w-3/4 rounded-lg" />
        <div className="skeleton h-64 w-full rounded-xl" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
          <div className="skeleton h-4 w-4/6 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="space-y-6">
        {!capabilities.hasBackButton && (
          <button
            onClick={() => navigate('/info')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            aria-label={t('common.back')}
          >
            <BackIcon />
          </button>
        )}
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
          {t('admin.infoPages.notFound')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      {!capabilities.hasBackButton && (
        <button
          onClick={() => navigate(-1)}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-dark-700 bg-dark-800 px-4 text-sm text-dark-400 transition-colors hover:border-dark-600 hover:text-dark-200"
          aria-label={t('common.back')}
        >
          <BackIcon />
          <span>{t('common.back')}</span>
        </button>
      )}

      {/* Page header */}
      <div>
        {page.icon && <span className="mb-2 inline-block text-3xl">{page.icon}</span>}
        <h1 className="text-2xl font-extrabold leading-tight text-dark-50 sm:text-3xl">
          {resolvedTitle}
        </h1>
      </div>

      {/* Page content */}
      {isFaq ? (
        <FaqView items={faqItems} />
      ) : (
        /* Regular page content - sanitized with DOMPurify (strict allowlist) */
        <div
          className="prose max-w-none overflow-x-auto lg:max-w-3xl"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      )}
    </div>
  );
}
