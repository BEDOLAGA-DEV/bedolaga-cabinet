/**
 * Theme-aware glass morphism color tokens.
 * Provides consistent colors for the glassmorphic card components
 * that work on both dark and light backgrounds.
 */
// Цвет текста темы: darkText в тёмной, через ремап .light — lightText в светлой.
const TEXT_VAR = '--color-dark-50';

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

    // Text — из палитры оператора, а не зашитые белый/чёрный: иначе кастомный
    // цвет текста не доходил до дашборда и карточек подписок. Годится только
    // для CSS-свойств: в SVG-атрибутах var() не раскрывается — там передавать
    // через style={{ stroke }}.
    text: `rgb(var(${TEXT_VAR}))`,
    textSecondary: `rgba(var(${TEXT_VAR}), ${isDark ? 0.4 : 0.5})`,
    textMuted: `rgba(var(${TEXT_VAR}), ${isDark ? 0.3 : 0.35})`,
    textFaint: `rgba(var(${TEXT_VAR}), 0.25)`,
    textGhost: `rgba(var(${TEXT_VAR}), ${isDark ? 0.08 : 0.06})`,

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
