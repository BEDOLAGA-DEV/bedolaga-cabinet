import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { themeColorsApi } from '../api/themeColors'
import { ThemeColors, DEFAULT_THEME_COLORS, SHADE_LEVELS, ColorPalette } from '../types/theme'

// Convert hex to RGB values
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Handle shorthand hex
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex)
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6
        break
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6
        break
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

// Convert HSL to RGB values
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100
  l /= 100

  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
  }

  return { r: f(0), g: f(8), b: f(4) }
}

// Convert RGB to string format for CSS variable
function rgbToString(r: number, g: number, b: number): string {
  return `${r}, ${g}, ${b}`
}

// Generate color palette from base color (returns RGB strings)
function generatePalette(baseHex: string): ColorPalette {
  const { h, s } = hexToHsl(baseHex)

  // Lightness values for each shade level (from light to dark)
  const lightnessMap: Record<number, number> = {
    50: 97,
    100: 94,
    200: 86,
    300: 76,
    400: 64,
    500: 50,
    600: 42,
    700: 34,
    800: 26,
    900: 18,
    950: 10,
  }

  const palette: Partial<ColorPalette> = {}

  for (const shade of SHADE_LEVELS) {
    const lightness = lightnessMap[shade]
    // Adjust saturation slightly for very light/dark shades
    const adjustedS = shade <= 100 ? s * 0.7 : shade >= 900 ? s * 0.8 : s
    const { r, g, b } = hslToRgb(h, adjustedS, lightness)
    palette[shade] = rgbToString(r, g, b)
  }

  return palette as ColorPalette
}

// Generate neutral palette from dark background color (for dark theme)
function generateDarkPalette(darkBgHex: string): ColorPalette {
  const { h, s } = hexToHsl(darkBgHex)

  // Use very low saturation for neutral colors
  const neutralS = Math.min(s, 15)

  // Lightness values - from very light (50) to very dark (950)
  const lightnessMap: Record<number, number> = {
    50: 97,
    100: 96,
    200: 89,
    300: 80,
    400: 58,
    500: 40,
    600: 28,
    700: 20,
    800: 12,
    850: 10,
    900: 7,
    950: 4,
  }

  const palette: Partial<ColorPalette> = {}

  for (const shade of [...SHADE_LEVELS, 850] as const) {
    const lightness = lightnessMap[shade as keyof typeof lightnessMap] || 50
    const { r, g, b } = hslToRgb(h, neutralS, lightness)
    palette[shade as keyof ColorPalette] = rgbToString(r, g, b)
  }

  return palette as ColorPalette
}

// Generate light theme palette (champagne-like)
function generateLightPalette(lightBgHex: string): ColorPalette {
  const { h, s } = hexToHsl(lightBgHex)

  // Lightness values for light theme - inverse of dark
  const lightnessMap: Record<number, number> = {
    50: 100,
    100: 98,
    200: 91,
    300: 83,
    400: 74,
    500: 64,
    600: 55,
    700: 42,
    800: 31,
    900: 21,
    950: 10,
  }

  const palette: Partial<ColorPalette> = {}

  for (const shade of SHADE_LEVELS) {
    const lightness = lightnessMap[shade]
    const { r, g, b } = hslToRgb(h, s, lightness)
    palette[shade] = rgbToString(r, g, b)
  }

  return palette as ColorPalette
}

// Apply theme colors as CSS variables (RGB format for Tailwind opacity support)
export function applyThemeColors(colors: ThemeColors): void {
  const root = document.documentElement

  // Generate palettes from base colors
  const accentPalette = generatePalette(colors.accent)
  const successPalette = generatePalette(colors.success)
  const warningPalette = generatePalette(colors.warning)
  const errorPalette = generatePalette(colors.error)

  // Generate dark/light palettes from background colors
  const darkPalette = generateDarkPalette(colors.darkBackground)
  const champagnePalette = generateLightPalette(colors.lightBackground)

  // Apply dark palette
  for (const shade of [...SHADE_LEVELS, 850] as const) {
    if (darkPalette[shade as keyof ColorPalette]) {
      root.style.setProperty(`--color-dark-${shade}`, darkPalette[shade as keyof ColorPalette])
    }
  }

  // Apply champagne/light palette
  for (const shade of SHADE_LEVELS) {
    root.style.setProperty(`--color-champagne-${shade}`, champagnePalette[shade])
  }

  // Apply accent palette
  for (const shade of SHADE_LEVELS) {
    root.style.setProperty(`--color-accent-${shade}`, accentPalette[shade])
  }

  // Apply success palette
  for (const shade of SHADE_LEVELS) {
    root.style.setProperty(`--color-success-${shade}`, successPalette[shade])
  }

  // Apply warning palette
  for (const shade of SHADE_LEVELS) {
    root.style.setProperty(`--color-warning-${shade}`, warningPalette[shade])
  }

  // Apply error palette
  for (const shade of SHADE_LEVELS) {
    root.style.setProperty(`--color-error-${shade}`, errorPalette[shade])
  }

  // Apply semantic colors (hex for direct use in some places)
  root.style.setProperty('--color-dark-bg', colors.darkBackground)
  root.style.setProperty('--color-dark-surface', colors.darkSurface)
  root.style.setProperty('--color-dark-text', colors.darkText)
  root.style.setProperty('--color-dark-text-secondary', colors.darkTextSecondary)

  root.style.setProperty('--color-light-bg', colors.lightBackground)
  root.style.setProperty('--color-light-surface', colors.lightSurface)
  root.style.setProperty('--color-light-text', colors.lightText)
  root.style.setProperty('--color-light-text-secondary', colors.lightTextSecondary)
}

export function useThemeColors() {
  const queryClient = useQueryClient()

  const {
    data: colors,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Apply colors when loaded or changed
  useEffect(() => {
    const colorsToApply = colors || DEFAULT_THEME_COLORS
    applyThemeColors(colorsToApply)
  }, [colors])

  const invalidateColors = () => {
    queryClient.invalidateQueries({ queryKey: ['theme-colors'] })
  }

  return {
    colors: colors || DEFAULT_THEME_COLORS,
    isLoading,
    error,
    invalidateColors,
  }
}
