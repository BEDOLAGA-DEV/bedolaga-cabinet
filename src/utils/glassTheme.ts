/**
 * Theme-aware glass morphism color tokens.
 * Provides consistent colors for the glassmorphic card components
 * that work on both dark and light backgrounds.
 */
export function getGlassColors(isDark: boolean) {
  return {
    // Card container
    cardBg: isDark
      ? 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
      : 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%)',
    cardBorder: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)',

    // Inner sections (cards within cards)
    innerBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    innerBorder: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',

    // Hover states
    hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    hoverBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',

    // Text
    text: isDark ? '#fff' : '#1a1a2e',
    textSecondary: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
    textFaint: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
    textGhost: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',

    // Progress bar track
    trackBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    trackBorder: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',

    // Code blocks
    codeBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
    codeBorder: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',

    // Glow effects — reduced in light mode
    glowAlpha: isDark ? '15' : '08',

    // Shadows for light mode depth
    shadow: isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
  };
}
