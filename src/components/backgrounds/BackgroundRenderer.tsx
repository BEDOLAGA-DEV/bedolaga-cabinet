import { Suspense, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '@/api/branding';
import type { AnimationConfig, BackgroundType } from '@/components/ui/backgrounds/types';
import { DEFAULT_ANIMATION_CONFIG } from '@/components/ui/backgrounds/types';
import { backgroundComponents, prefetchBackground } from '@/components/ui/backgrounds/registry';

const ANIMATION_CACHE_KEY = 'cabinet_animation_config';

function getCachedConfig(): AnimationConfig | null {
  try {
    const cached = localStorage.getItem(ANIMATION_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

// Prefetch the background JS chunk immediately based on localStorage cache.
// This starts the download before React even renders, so by the time
// Suspense needs the component, the chunk is already loaded.
const cachedConfig = getCachedConfig();
if (cachedConfig?.enabled && cachedConfig.type && cachedConfig.type !== 'none') {
  prefetchBackground(cachedConfig.type);
}

function setCachedConfig(config: AnimationConfig) {
  try {
    localStorage.setItem(ANIMATION_CACHE_KEY, JSON.stringify(config));
  } catch {
    // localStorage not available
  }
}

export function setCachedAnimationConfig(config: AnimationConfig) {
  setCachedConfig(config);
}

function reduceMobileSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const reduced = { ...settings };
  if (typeof reduced.particleCount === 'number')
    reduced.particleCount = Math.floor((reduced.particleCount as number) / 2);
  if (typeof reduced.particleDensity === 'number')
    reduced.particleDensity = Math.floor((reduced.particleDensity as number) / 2);
  if (typeof reduced.number === 'number')
    reduced.number = Math.floor((reduced.number as number) / 2);
  if ('interactive' in reduced) reduced.interactive = false;
  return reduced;
}

export function BackgroundRenderer() {
  const prefersReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const { data: config } = useQuery({
    queryKey: ['animation-config'],
    queryFn: async () => {
      const result = await brandingApi.getAnimationConfig();
      setCachedConfig(result);
      return result;
    },
    initialData: getCachedConfig() ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });

  const effectiveConfig = config ?? DEFAULT_ANIMATION_CONFIG;

  if (!effectiveConfig.enabled || effectiveConfig.type === 'none' || prefersReducedMotion) {
    return null;
  }

  const bgType = effectiveConfig.type as Exclude<BackgroundType, 'none'>;
  const Component = backgroundComponents[bgType];

  if (!Component) return null;

  const isMobile = window.innerWidth < 768;
  const settings =
    effectiveConfig.reducedOnMobile && isMobile
      ? reduceMobileSettings(effectiveConfig.settings)
      : effectiveConfig.settings;

  // Render via portal on document.body with z-index: -1.
  // This places the animated background BELOW the root stacking context,
  // preventing Chrome's implicit compositing from promoting every
  // overlapping element to its own GPU layer (the root cause of flickering).
  return createPortal(
    <div
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: -1,
        opacity: effectiveConfig.opacity,
        filter: effectiveConfig.blur > 0 ? `blur(${effectiveConfig.blur}px)` : undefined,
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
