import { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { newsApi } from '../api/news';
import { usePlatform } from '../platform/hooks/usePlatform';

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

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

/**
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks.
 * Uses explicit allowlists (not ADD_TAGS/ADD_ATTR) for defense-in-depth.
 *
 * iframe elements are allowed only when their src points to a trusted
 * video host (YouTube, Vimeo) over HTTPS. All other iframes are stripped.
 */
const ALLOWED_IFRAME_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'www.youtube-nocookie.com',
]);

/**
 * Validate that an iframe src URL points to a trusted host over HTTPS.
 * Returns false for any non-HTTPS, non-allowlisted, or malformed URL.
 */
function isAllowedIframeSrc(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && ALLOWED_IFRAME_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Strict allowlist of tags and attributes for article content.
 * Using ALLOWED_TAGS / ALLOWED_ATTR instead of ADD_TAGS / ADD_ATTR
 * ensures nothing from the permissive defaults leaks through.
 *
 * IMPORTANT: <source> is intentionally NOT in ALLOWED_TAGS — this ensures
 * <video> elements can only load from their own src attribute (validated by hook).
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    // Block elements
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
    // Inline elements
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
    // Embed (validated by afterSanitizeAttributes hook)
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
    // video-specific
    'controls',
    'preload',
    // iframe-specific (validated by hook)
    'frameborder',
    'allowfullscreen',
    'allow',
    'sandbox',
    // text-align from TipTap editor
    'style',
  ],
  ALLOW_DATA_ATTR: false,
  // Force all links to open in new tab safely
  ADD_ATTR: ['target'],
};

/**
 * Isolated DOMPurify instance for article content sanitization.
 * Using a separate instance avoids polluting the global DOMPurify singleton
 * that other pages may use with their own hooks/config.
 */
const articlePurify = DOMPurify(window);

// Register sanitization hooks once at module init.
// All hooks are stateless and idempotent — no need to add/remove per call.

// Hook: strip iframes with disallowed src
articlePurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    const src = node.getAttribute('src') ?? '';
    if (!isAllowedIframeSrc(src)) {
      node.remove();
      return;
    }
    // Force sandbox — allow-scripts + allow-same-origin needed for YouTube/Vimeo
    // (cross-origin, so sandbox escape via frameElement is not possible)
    node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    // Always set allow — restricts permissions even if original had none
    node.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  }
});

// Hook: validate <video> src — only allow http/https (block javascript:, data:, etc.)
// HTTP is permitted because request.base_url behind a reverse proxy returns http://
articlePurify.addHook('afterSanitizeAttributes', (node) => {
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

// Hook: force safe link attributes
articlePurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// Hook: restrict inline styles to text-align only (used by TipTap)
articlePurify.addHook('afterSanitizeAttributes', (node) => {
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
  return articlePurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Validates that a color string is a safe hex color.
 * Prevents CSS injection via malicious category_color values.
 * Returns the color if valid, otherwise returns a safe fallback.
 */
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function safeColor(color: string | null | undefined, fallback = '#888888'): string {
  if (!color || !HEX_COLOR_RE.test(color)) return fallback;
  return color;
}

/**
 * Validates that a URL uses a safe protocol (https or http only).
 * Prevents javascript:, data:, and other dangerous URI schemes.
 */
function isSafeUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function NewsArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { capabilities, backButton } = usePlatform();

  // Show Telegram native back button (use ref to avoid effect re-runs)
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
    data: article,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['news', 'article', slug],
    queryFn: () => {
      if (!slug) throw new Error('Missing slug parameter');
      return newsApi.getArticle(slug);
    },
    enabled: !!slug,
    staleTime: 60_000,
  });

  const sanitizedContent = useMemo(() => (article ? sanitizeHtml(article.content) : ''), [article]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-32 rounded-lg" />
        <div className="skeleton h-10 w-3/4 rounded-lg" />
        <div className="skeleton h-5 w-48 rounded-lg" />
        <div className="skeleton h-64 w-full rounded-xl" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
          <div className="skeleton h-4 w-4/6 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="space-y-6">
        {!capabilities.hasBackButton && (
          <button
            onClick={() => navigate('/')}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            aria-label={t('news.backToHome')}
          >
            <BackIcon />
          </button>
        )}
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
          {t('news.noNews')}
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
          aria-label={t('news.backToHome')}
        >
          <BackIcon />
          <span>{t('news.backToHome')}</span>
        </button>
      )}

      {/* Article header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Category + tag */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {(() => {
            const color = safeColor(article.category_color);
            return (
              <>
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest"
                  style={{
                    color,
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                  />
                  {article.category}
                </span>
                {article.tag && (
                  <span
                    className="inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color,
                      border: `1px solid ${color}33`,
                      background: `${color}11`,
                    }}
                  >
                    {article.tag}
                  </span>
                )}
              </>
            );
          })()}
        </div>

        {/* Title */}
        <h1 className="mb-4 text-2xl font-extrabold leading-tight text-dark-50 sm:text-3xl">
          {article.title}
        </h1>

        {/* Meta info */}
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-dark-400">
          {article.published_at && (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <CalendarIcon />
              {new Date(article.published_at).toLocaleDateString(i18n.language)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-mono text-xs">
            <ClockIcon />
            {article.read_time_minutes} {t('news.readTime')}
          </span>
        </div>
      </motion.div>

      {/* Featured image - only render if URL uses safe protocol */}
      {isSafeUrl(article.featured_image_url) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="overflow-hidden rounded-xl"
        >
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="max-h-96 w-full rounded-xl object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </motion.div>
      )}

      {/* Article content - sanitized with DOMPurify */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="prose max-w-none lg:max-w-3xl"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </div>
  );
}
