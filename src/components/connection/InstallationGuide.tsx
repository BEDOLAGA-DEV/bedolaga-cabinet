import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import type {
  AppConfig,
  LocalizedText,
  RemnawaveAppClient,
  RemnawavePlatformData,
  RemnawaveButtonClient,
} from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { CardsBlock, TimelineBlock, AccordionBlock, MinimalBlock, BlockButtons } from './blocks';
import type { BlockRendererProps } from './blocks';

const platformOrder = ['ios', 'android', 'windows', 'macos', 'linux', 'androidTV', 'appleTV'];

function detectPlatform(): string | null {
  if (typeof window === 'undefined' || !navigator?.userAgent) return null;
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return /tv|television/.test(ua) ? 'androidTV' : 'android';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/windows/.test(ua)) return 'windows';
  if (/linux/.test(ua)) return 'linux';
  return null;
}

const RENDERERS: Record<string, React.ComponentType<BlockRendererProps>> = {
  cards: CardsBlock,
  timeline: TimelineBlock,
  accordion: AccordionBlock,
  minimal: MinimalBlock,
};

const BackIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

interface Props {
  appConfig: AppConfig;
  onOpenDeepLink: (url: string) => void;
  isTelegramWebApp: boolean;
  onGoBack: () => void;
  onOpenQR?: () => void;
}

export default function InstallationGuide({
  appConfig,
  onOpenDeepLink,
  isTelegramWebApp,
  onGoBack,
  onOpenQR,
}: Props) {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();

  const detectedPlatform = useMemo(() => detectPlatform(), []);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const [activePlatformKey, setActivePlatformKey] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<RemnawaveAppClient | null>(null);

  // --- Helpers ---

  const getLocalizedText = useCallback(
    (text: LocalizedText | undefined): string => {
      if (!text) return '';
      const lang = i18n.language || 'en';
      return text[lang] || text['en'] || text['ru'] || Object.values(text)[0] || '';
    },
    [i18n.language],
  );

  const getBaseTranslation = useCallback(
    (key: string, i18nKey: string): string => {
      const bt = appConfig.baseTranslations;
      if (bt && key in bt) {
        const text = getLocalizedText(bt[key as keyof typeof bt] as LocalizedText);
        if (text) return text;
      }
      return t(i18nKey);
    },
    [appConfig.baseTranslations, getLocalizedText, t],
  );

  const getSvgHtml = useCallback(
    (svgKey: string | undefined): string => {
      if (!svgKey || !appConfig.svgLibrary?.[svgKey]) return '';
      const entry = appConfig.svgLibrary[svgKey];
      const raw = typeof entry === 'string' ? entry : entry.svgString;
      if (!raw) return '';
      return DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } });
    },
    [appConfig.svgLibrary],
  );

  // --- Available platforms ---

  const availablePlatforms = useMemo(() => {
    if (!appConfig.platforms) return [];
    const available = platformOrder.filter((key) => {
      const data = appConfig.platforms[key] as RemnawavePlatformData | undefined;
      return data && data.apps && data.apps.length > 0;
    });
    if (detectedPlatform && available.includes(detectedPlatform)) {
      return [detectedPlatform, ...available.filter((p) => p !== detectedPlatform)];
    }
    return available;
  }, [appConfig.platforms, detectedPlatform]);

  // --- Auto-select platform & app ---

  useEffect(() => {
    if (selectedApp || !availablePlatforms.length) return;
    const platform = availablePlatforms[0];
    const data = appConfig.platforms[platform] as RemnawavePlatformData | undefined;
    if (!data?.apps?.length) return;
    const app = data.apps.find((a) => a.featured) || data.apps[0];
    if (app) {
      setSelectedApp(app);
      setActivePlatformKey(platform);
    }
  }, [appConfig.platforms, availablePlatforms, selectedApp]);

  // --- Button renderer (delegates to BlockButtons component) ---

  const renderBlockButtons = useCallback(
    (buttons: RemnawaveButtonClient[] | undefined, variant: 'light' | 'subtle') => (
      <BlockButtons
        buttons={buttons}
        variant={variant}
        isLight={isLight}
        subscriptionUrl={appConfig.subscriptionUrl}
        hideLink={appConfig.hideLink}
        deepLink={selectedApp?.deepLink}
        getLocalizedText={getLocalizedText}
        getBaseTranslation={getBaseTranslation}
        getSvgHtml={getSvgHtml}
        onOpenDeepLink={onOpenDeepLink}
      />
    ),
    [
      appConfig.subscriptionUrl,
      appConfig.hideLink,
      selectedApp?.deepLink,
      isLight,
      getLocalizedText,
      getBaseTranslation,
      getSvgHtml,
      onOpenDeepLink,
    ],
  );

  // --- Current platform data ---

  const currentPlatformKey = activePlatformKey || availablePlatforms[0];
  const currentPlatformData = currentPlatformKey
    ? (appConfig.platforms[currentPlatformKey] as RemnawavePlatformData | undefined)
    : undefined;
  const currentPlatformApps = currentPlatformData?.apps || [];

  // Platform display name
  const getPlatformDisplayName = useCallback(
    (key: string): string => {
      const data = appConfig.platforms[key] as RemnawavePlatformData | undefined;
      if (data?.displayName) {
        const name = getLocalizedText(data.displayName);
        if (name) return name;
      }
      if (appConfig.platformNames?.[key]) {
        return getLocalizedText(appConfig.platformNames[key]);
      }
      const fallback: Record<string, string> = {
        ios: 'iOS',
        android: 'Android',
        windows: 'Windows',
        macos: 'macOS',
        linux: 'Linux',
        androidTV: 'Android TV',
        appleTV: 'Apple TV',
      };
      return fallback[key] || key;
    },
    [appConfig.platforms, appConfig.platformNames, getLocalizedText],
  );

  // Platform SVG icon for dropdown
  const currentPlatformSvg = getSvgHtml(currentPlatformData?.svgIconKey);

  // Block renderer
  const blockType = appConfig.uiConfig?.installationGuidesBlockType || 'cards';
  const Renderer = RENDERERS[blockType] || CardsBlock;

  return (
    <div className="space-y-6 pb-6">
      {/* Header + platform dropdown */}
      <div className="flex items-center gap-3">
        {!isTelegramWebApp && (
          <button
            onClick={onGoBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon />
          </button>
        )}
        <h2 className="flex-1 text-lg font-bold text-dark-100">
          {getBaseTranslation('installationGuideHeader', 'subscription.connection.title')}
        </h2>
        {appConfig.subscriptionUrl && onOpenQR && (
          <button
            onClick={() => onOpenQR()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 text-dark-200 transition-colors hover:border-dark-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75H16.5v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h3v3h-3v-3z"
              />
            </svg>
          </button>
        )}
        {availablePlatforms.length > 1 && (
          <div className="relative flex items-center">
            {currentPlatformSvg && (
              <div
                className="pointer-events-none absolute left-3 z-10 h-5 w-5 text-dark-400 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: currentPlatformSvg }}
              />
            )}
            <select
              value={currentPlatformKey || ''}
              onChange={(e) => {
                const newPlatform = e.target.value;
                setActivePlatformKey(newPlatform);
                const data = appConfig.platforms[newPlatform] as RemnawavePlatformData | undefined;
                if (data?.apps?.length) {
                  const app = data.apps.find((a) => a.featured) || data.apps[0];
                  if (app) setSelectedApp(app);
                }
              }}
              className={`appearance-none rounded-xl border py-2 pr-8 text-sm font-medium outline-none transition-colors ${
                isLight
                  ? 'border-dark-700/60 bg-white/80 text-dark-200 shadow-sm hover:border-dark-600'
                  : 'border-dark-700 bg-dark-800 text-dark-200 hover:border-dark-600'
              } ${currentPlatformSvg ? 'pl-10' : 'pl-4'}`}
            >
              {availablePlatforms.map((p) => (
                <option key={p} value={p}>
                  {getPlatformDisplayName(p)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 text-dark-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M8 15l4 4 4-4" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* App chips */}
      {currentPlatformApps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentPlatformApps.map((app, idx) => {
            const isSelected = selectedApp?.name === app.name;
            const appIconSvg = getSvgHtml(app.svgIconKey);
            return (
              <button
                key={app.name + idx}
                onClick={() => setSelectedApp(app)}
                className={`relative flex min-w-[calc(50%-0.25rem)] items-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                  isSelected
                    ? isLight
                      ? 'bg-accent-500/15 text-accent-600 ring-1 ring-accent-500/40'
                      : 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/40'
                    : isLight
                      ? 'border border-dark-700/60 bg-white/80 text-dark-200 shadow-sm hover:border-dark-600/50 hover:bg-white'
                      : 'border border-dark-700/50 bg-dark-800/80 text-dark-200 hover:border-dark-600/50 hover:bg-dark-700/80'
                }`}
              >
                {app.featured && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                <span className="relative z-10 truncate">{app.name}</span>
                {appIconSvg && (
                  <div
                    className="ml-auto h-7 w-7 shrink-0 opacity-30 [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: appIconSvg }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tutorial button */}
      {appConfig.baseSettings?.isShowTutorialButton && appConfig.baseSettings?.tutorialUrl && (
        <a
          href={appConfig.baseSettings.tutorialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary w-full justify-center"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          {getBaseTranslation('tutorial', 'subscription.connection.tutorial')}
        </a>
      )}

      {/* Blocks */}
      {selectedApp && (
        <Renderer
          blocks={selectedApp.blocks}
          isMobile={isMobile}
          isLight={isLight}
          getLocalizedText={getLocalizedText}
          getSvgHtml={getSvgHtml}
          renderBlockButtons={renderBlockButtons}
        />
      )}
    </div>
  );
}
