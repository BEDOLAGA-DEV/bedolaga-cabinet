import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { adminUpdatesApi, ReleaseItem, ProjectReleasesInfo } from '../api/adminUpdates';
import {
  BackIcon,
  RefreshIcon,
  BotIcon,
  CabinetIcon,
  TagIcon,
  CalendarIcon,
  ExternalLinkIcon,
} from '@/components/icons';

declare const __APP_VERSION__: string;

// ============ Helpers ============

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function stripVPrefix(tag: string): string {
  return tag.replace(/^v/, '');
}

function renderMarkdown(md: string): string {
  const html = md
    // Headers: ### Title -> <h3>Title</h3>
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold: **text** -> <strong>text</strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Inline code: `text` -> <code>text</code>
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links: [text](url) -> <a>text</a>
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );

  // Process lines into blocks
  const lines = html.split('\n');
  const blocks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.join('')}</ul>`);
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    // List item: * text or - text
    const listMatch = trimmed.match(/^[*-]\s+(.+)$/);
    if (listMatch) {
      listItems.push(`<li>${listMatch[1]}</li>`);
      continue;
    }
    // Already an HTML block element from header replacement
    if (/^<h[1-4]>/.test(trimmed)) {
      flushList();
      blocks.push(trimmed);
      continue;
    }
    // Regular line
    flushList();
    blocks.push(`<p>${trimmed}</p>`);
  }
  flushList();

  return DOMPurify.sanitize(blocks.join(''), {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'li', 'strong', 'em', 'code', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

// ============ Components ============

function VersionBadge({ hasUpdate }: { hasUpdate: boolean }) {
  const { t } = useTranslation();

  if (hasUpdate) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-500/20 px-2.5 py-0.5 text-xs font-medium text-warning-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning-400" />
        {t('adminUpdates.updateAvailable')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-500/20 px-2.5 py-0.5 text-xs font-medium text-success-400">
      <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
      {t('adminUpdates.upToDate')}
    </span>
  );
}

function ReleaseCard({ release }: { release: ReleaseItem }) {
  const { t } = useTranslation();
  // Content is sanitized via DOMPurify in renderMarkdown — safe for innerHTML
  const bodyHtml = useMemo(
    () => (release.body ? renderMarkdown(release.body) : ''),
    [release.body],
  );

  return (
    <div className="border-b border-dark-700/30 px-4 py-3 last:border-b-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-dark-200">
          <TagIcon className="h-3.5 w-3.5" />
          <span className="text-sm font-semibold">{release.tag_name}</span>
        </div>
        {release.name !== release.tag_name && (
          <span className="text-sm text-dark-400">{release.name}</span>
        )}
        {release.prerelease && (
          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
            {t('adminUpdates.prerelease')}
          </span>
        )}
        <div className="flex items-center gap-1 text-dark-500 sm:ml-auto">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="text-xs">{formatDate(release.published_at)}</span>
        </div>
      </div>
      {bodyHtml ? (
        <div
          className="release-body max-h-48 overflow-auto rounded-lg bg-dark-900/50 p-3 text-xs leading-relaxed text-dark-300 [&_a]:text-accent-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-300 [&_code]:rounded [&_code]:bg-dark-700/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-dark-200 [&_h2]:mb-1.5 [&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-dark-200 first:[&_h2]:mt-0 [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-dark-200 first:[&_h3]:mt-0 [&_h4]:mb-0.5 [&_h4]:mt-1.5 [&_h4]:text-xs [&_h4]:font-medium [&_h4]:text-dark-300 [&_li]:ml-4 [&_li]:list-disc [&_li]:py-0.5 [&_p]:my-1"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : null}
    </div>
  );
}

function ProjectSection({
  icon,
  title,
  info,
  currentVersion,
  hasUpdate,
  repoUrl,
}: {
  icon: React.ReactNode;
  title: string;
  info: ProjectReleasesInfo;
  currentVersion: string;
  hasUpdate: boolean;
  repoUrl: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-xl border border-dark-700/50 bg-dark-800/40">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-dark-700/50 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-dark-700/50 text-dark-300">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-dark-100">{title}</h2>
            <VersionBadge hasUpdate={hasUpdate} />
          </div>
          <p className="text-xs text-dark-500">
            {t('adminUpdates.currentVersion')}:{' '}
            <span className="font-mono font-medium text-dark-300">{currentVersion || '—'}</span>
          </p>
        </div>
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg border border-dark-700/50 px-2.5 py-1.5 text-xs text-dark-400 transition-colors hover:border-dark-600 hover:text-dark-300"
        >
          GitHub
          <ExternalLinkIcon className="h-4 w-4" />
        </a>
      </div>

      {/* Releases list */}
      {info.releases.length > 0 ? (
        <div className="max-h-[600px] overflow-y-auto">
          {info.releases.map((release) => (
            <ReleaseCard key={release.tag_name} release={release} />
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm text-dark-500">
          {t('adminUpdates.noReleases')}
        </div>
      )}
    </div>
  );
}

// ============ Page ============

export default function AdminUpdates() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'releases'],
    queryFn: adminUpdatesApi.getReleases,
    staleTime: 60_000,
  });

  // Cabinet has_updates: compare __APP_VERSION__ with latest release
  const cabinetHasUpdate = (() => {
    if (!data?.cabinet.releases.length) return false;
    try {
      const latestTag = data.cabinet.releases.find((r) => !r.prerelease)?.tag_name;
      if (!latestTag) return false;
      return stripVPrefix(latestTag) !== stripVPrefix(__APP_VERSION__);
    } catch {
      return false;
    }
  })();

  return (
    <div className="animate-fade-in space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-700/50 bg-dark-800/40 transition-colors hover:border-dark-600 hover:bg-dark-800"
        >
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-dark-100">{t('adminUpdates.title')}</h1>
          <p className="text-xs text-dark-500">{t('adminUpdates.subtitle')}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg border border-dark-700/50 bg-dark-800/40 px-3 py-2 text-xs text-dark-300 transition-colors hover:border-dark-600 hover:bg-dark-800 disabled:opacity-50"
        >
          <span className={isFetching ? 'animate-spin' : ''}>
            <RefreshIcon />
          </span>
          <span className="hidden sm:inline">{t('adminUpdates.refresh')}</span>
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-dark-700/50 bg-dark-800/40"
            />
          ))}
        </div>
      )}

      {/* Content */}
      {data && (
        <div className="space-y-4">
          <ProjectSection
            icon={<BotIcon />}
            title={t('adminUpdates.bot')}
            info={data.bot}
            currentVersion={data.bot.current_version}
            hasUpdate={data.bot.has_updates}
            repoUrl={data.bot.repo_url}
          />
          <ProjectSection
            icon={<CabinetIcon />}
            title={t('adminUpdates.cabinet')}
            info={data.cabinet}
            currentVersion={__APP_VERSION__}
            hasUpdate={cabinetHasUpdate}
            repoUrl={data.cabinet.repo_url}
          />
        </div>
      )}
    </div>
  );
}
