import { Suspense, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '@/api/branding';
import type { AnimationConfig, BackgroundType } from '@/components/ui/backgrounds/types';
import { DEFAULT_ANIMATION_CONFIG } from '@/components/ui/backgrounds/types';
import { backgroundComponents, prefetchBackground } from '@/components/ui/backgrounds/registry';

const ANIMATION_CACHE_KEY = 'cabinet_animation_config';
const MAX_CONFIG_JSON_LENGTH = 10_000;

const VALID_TYPES: ReadonlySet<string> = new Set<BackgroundType>([
  'aurora',
  'sparkles',
  'vortex',
  'shooting-stars',
  'background-beams',
  'background-beams-collision',
  'gradient-animation',
  'wavy',
  'background-lines',
  'boxes',
  'meteors',
  'grid',
  'dots',
  'spotlight',
  'ripple',
  'none',
]);

function validateConfig(parsed: unknown): AnimationConfig | null {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.enabled !== 'boolean') return null;
  if (typeof obj.type !== 'string' || !VALID_TYPES.has(obj.type)) return null;
  if (typeof obj.opacity !== 'number') return null;
  if (typeof obj.blur !== 'number') return null;
  if (obj.settings != null && (typeof obj.settings !== 'object' || Array.isArray(obj.settings)))
    return null;
  return {
    enabled: obj.enabled,
    type: obj.type as BackgroundType,
    opacity: Math.max(0, Math.min(1, obj.opacity)),
    blur: Math.max(0, Math.min(50, obj.blur)),
    settings: (obj.settings as Record<string, unknown>) ?? {},
    reducedOnMobile: typeof obj.reducedOnMobile === 'boolean' ? obj.reducedOnMobile : true,
  };
}

function getCachedConfig(): AnimationConfig | null {
  try {
    const cached = localStorage.getItem(ANIMATION_CACHE_KEY);
    if (!cached || cached.length > MAX_CONFIG_JSON_LENGTH) return null;
    return validateConfig(JSON.parse(cached));
  } catch {
    return null;
  }
}

// Prefetch the background JS chunk immediately based on localStorage cache.
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
  const validated = validateConfig(config);
  if (validated) setCachedConfig(validated);
}

function reduceMobileSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const reduced = { ...settings };
  // 75% reduction (divide by 4) instead of 50% — much less GPU work
  if (typeof reduced.particleCount === 'number')
    reduced.particleCount = Math.max(20, Math.floor(reduced.particleCount / 4));
  if (typeof reduced.particleDensity === 'number')
    reduced.particleDensity = Math.max(50, Math.floor(reduced.particleDensity / 4));
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

export function BackgroundRenderer() {
  const prefersReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const { data: config } = useQuery({
    queryKey: ['animation-config'],
    queryFn: async () => {
      const raw = await brandingApi.getAnimationConfig();
      // Validate and clamp API response same as localStorage
      const result = validateConfig(raw) ?? DEFAULT_ANIMATION_CONFIG;
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

  // On mobile, cap blur to 4px max — full blur is extremely GPU-heavy
  const effectiveBlur = isMobile ? Math.min(effectiveConfig.blur, 4) : effectiveConfig.blur;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: -2,
        opacity: effectiveConfig.opacity,
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
