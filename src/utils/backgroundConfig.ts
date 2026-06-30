import type { AnimationConfig, BackgroundType } from '@/components/ui/backgrounds/types';

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
  'fireflies',
  'snowfall',
  'starfield',
  'matrix-rain',
  'liquid-gradient',
  'constellation',
  'none',
]);

export function validateConfig(parsed: unknown): AnimationConfig | null {
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

export function getCachedConfig(): AnimationConfig | null {
  try {
    const cached = localStorage.getItem(ANIMATION_CACHE_KEY);
    if (!cached || cached.length > MAX_CONFIG_JSON_LENGTH) return null;
    return validateConfig(JSON.parse(cached));
  } catch {
    return null;
  }
}

export function setCachedConfig(config: AnimationConfig) {
  try {
    localStorage.setItem(ANIMATION_CACHE_KEY, JSON.stringify(config));
  } catch {}
}

export function setCachedAnimationConfig(config: AnimationConfig) {
  const validated = validateConfig(config);
  if (validated) setCachedConfig(validated);
}
