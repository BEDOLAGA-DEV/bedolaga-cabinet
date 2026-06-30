import { Suspense, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '@/api/branding';
import type { AnimationConfig, BackgroundType } from '@/components/ui/backgrounds/types';
import { DEFAULT_ANIMATION_CONFIG } from '@/components/ui/backgrounds/types';
import { backgroundComponents, prefetchBackground } from '@/components/ui/backgrounds/registry';
import { validateConfig, getCachedConfig, setCachedConfig } from '@/utils/backgroundConfig';

// Prefetch the background JS chunk immediately based on localStorage cache.
const cachedConfig = getCachedConfig();
if (cachedConfig?.enabled && cachedConfig.type && cachedConfig.type !== 'none') {
  prefetchBackground(cachedConfig.type);
}

function reduceMobileSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const reduced = { ...settings };
  // 75% reduction (divide by 4) instead of 50% — much less GPU work
  if (typeof reduced.particleCount === 'number')
    reduced.particleCount = Math.max(20, Math.floor(reduced.particleCount / 4));
  if (typeof reduced.particleDensity === 'number')
    reduced.particleDensity = Math.max(50, Math.floor(reduced.particleDensity / 4));
  if (typeof reduced.density === 'number')
    reduced.density = Math.max(20, Math.floor(reduced.density / 2));
  if (typeof reduced.starCount === 'number')
    reduced.starCount = Math.max(50, Math.floor(reduced.starCount / 4));
  if (typeof reduced.number === 'number')
    reduced.number = Math.max(5, Math.floor(reduced.number / 4));
  if ('interactive' in reduced) reduced.interactive = false;
  if (typeof reduced.lineCount === 'number')
    reduced.lineCount = Math.max(5, Math.floor(reduced.lineCount / 2));
  if (typeof reduced.rippleCount === 'number')
    reduced.rippleCount = Math.max(2, Math.floor(reduced.rippleCount / 2));
  if (typeof reduced.count === 'number') reduced.count = Math.max(3, Math.floor(reduced.count / 2));
  if (typeof reduced.rows === 'number') reduced.rows = Math.max(4, Math.floor(reduced.rows * 0.6));
  if (typeof reduced.cols === 'number') reduced.cols = Math.max(4, Math.floor(reduced.cols * 0.6));
  return reduced;
}

function RenderBackground({ config }: { config: AnimationConfig }) {
  const prefersReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  if (!config.enabled || config.type === 'none' || prefersReducedMotion) {
    return null;
  }

  const bgType = config.type as Exclude<BackgroundType, 'none'>;
  const Component = backgroundComponents[bgType];

  if (!Component) return null;

  const isMobile = window.innerWidth < 768;
  const settings =
    config.reducedOnMobile && isMobile ? reduceMobileSettings(config.settings) : config.settings;

  // On mobile, cap blur to 4px max — full blur is extremely GPU-heavy
  const effectiveBlur = isMobile ? Math.min(config.blur, 4) : config.blur;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: -2,
        opacity: config.opacity,
        filter: effectiveBlur > 0 ? `blur(${effectiveBlur}px)` : undefined,
        contain: 'strict',
        backfaceVisibility: 'hidden',
      }}
    >
      <Suspense fallback={null}>
        <Component settings={settings} />
      </Suspense>
    </div>,
    document.body,
  );
}

export function BackgroundRenderer() {
  const { data: config } = useQuery({
    queryKey: ['animation-config'],
    queryFn: async () => {
      const raw = await brandingApi.getAnimationConfig();
      const result = validateConfig(raw) ?? DEFAULT_ANIMATION_CONFIG;
      setCachedConfig(result);
      return result;
    },
    initialData: getCachedConfig() ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });

  const effectiveConfig = config ?? DEFAULT_ANIMATION_CONFIG;
  return <RenderBackground config={effectiveConfig} />;
}

export function StaticBackgroundRenderer({ config }: { config: AnimationConfig }) {
  const validated = useMemo(() => validateConfig(config), [config]);
  if (!validated) return null;
  return <RenderBackground config={validated} />;
}
