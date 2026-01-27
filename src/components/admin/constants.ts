import { ThemeColors, DEFAULT_THEME_COLORS } from '../../types/theme';

// Menu item types
export interface MenuItem {
  id: string;
  iconType?: 'star' | null;
  categories?: string[];
}

export interface MenuSection {
  id: string;
  items: MenuItem[];
}

// Sidebar menu configuration
export const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'main',
    items: [
      { id: 'favorites', iconType: 'star' },
      { id: 'branding', iconType: null },
      { id: 'theme', iconType: null },
      { id: 'analytics', iconType: null },
    ],
  },
  {
    id: 'settings',
    items: [
      {
        id: 'payments',
        iconType: null,
        categories: [
          'PAYMENT',
          'PAYMENT_VERIFICATION',
          'YOOKASSA',
          'CRYPTOBOT',
          'HELEKET',
          'PLATEGA',
          'TRIBUTE',
          'MULENPAY',
          'PAL24',
          'WATA',
          'TELEGRAM',
        ],
      },
      {
        id: 'subscriptions',
        iconType: null,
        categories: [
          'SUBSCRIPTIONS_CORE',
          'SIMPLE_SUBSCRIPTION',
          'PERIODS',
          'SUBSCRIPTION_PRICES',
          'TRAFFIC',
          'TRAFFIC_PACKAGES',
          'TRIAL',
          'AUTOPAY',
        ],
      },
      {
        id: 'interface',
        iconType: null,
        categories: [
          'INTERFACE',
          'INTERFACE_BRANDING',
          'INTERFACE_SUBSCRIPTION',
          'CONNECT_BUTTON',
          'MINIAPP',
          'HAPP',
          'SKIP',
          'ADDITIONAL',
        ],
      },
      {
        id: 'notifications',
        iconType: null,
        categories: ['NOTIFICATIONS', 'ADMIN_NOTIFICATIONS', 'ADMIN_REPORTS'],
      },
      { id: 'database', iconType: null, categories: ['DATABASE', 'POSTGRES', 'SQLITE', 'REDIS'] },
      {
        id: 'system',
        iconType: null,
        categories: [
          'CORE',
          'REMNAWAVE',
          'SERVER_STATUS',
          'MONITORING',
          'MAINTENANCE',
          'BACKUP',
          'VERSION',
          'WEB_API',
          'WEBHOOK',
          'LOG',
          'DEBUG',
          'EXTERNAL_ADMIN',
        ],
      },
      {
        id: 'users',
        iconType: null,
        categories: ['SUPPORT', 'LOCALIZATION', 'CHANNEL', 'TIMEZONE', 'REFERRAL', 'MODERATION'],
      },
    ],
  },
];

// Theme preset type
export interface ThemePreset {
  id: string;
  colors: ThemeColors;
}

// Theme presets
export const THEME_PRESETS: ThemePreset[] = [
  { id: 'standard', colors: DEFAULT_THEME_COLORS },
  {
    id: 'ocean',
    colors: {
      accent: '#0ea5e9',
      darkBackground: '#0c1222',
      darkSurface: '#1e293b',
      darkText: '#f1f5f9',
      darkTextSecondary: '#94a3b8',
      lightBackground: '#e0f2fe',
      lightSurface: '#f0f9ff',
      lightText: '#0c4a6e',
      lightTextSecondary: '#0369a1',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'forest',
    colors: {
      accent: '#22c55e',
      darkBackground: '#0a1a0f',
      darkSurface: '#14532d',
      darkText: '#f0fdf4',
      darkTextSecondary: '#86efac',
      lightBackground: '#dcfce7',
      lightSurface: '#f0fdf4',
      lightText: '#14532d',
      lightTextSecondary: '#166534',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'sunset',
    colors: {
      accent: '#f97316',
      darkBackground: '#1c1009',
      darkSurface: '#2d1a0e',
      darkText: '#fff7ed',
      darkTextSecondary: '#fdba74',
      lightBackground: '#ffedd5',
      lightSurface: '#fff7ed',
      lightText: '#7c2d12',
      lightTextSecondary: '#c2410c',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'violet',
    colors: {
      accent: '#a855f7',
      darkBackground: '#0f0a1a',
      darkSurface: '#1e1b2e',
      darkText: '#faf5ff',
      darkTextSecondary: '#c4b5fd',
      lightBackground: '#f3e8ff',
      lightSurface: '#faf5ff',
      lightText: '#581c87',
      lightTextSecondary: '#7e22ce',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'rose',
    colors: {
      accent: '#f43f5e',
      darkBackground: '#1a0a10',
      darkSurface: '#2d1520',
      darkText: '#fff1f2',
      darkTextSecondary: '#fda4af',
      lightBackground: '#ffe4e6',
      lightSurface: '#fff1f2',
      lightText: '#881337',
      lightTextSecondary: '#be123c',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'midnight',
    colors: {
      accent: '#6366f1',
      darkBackground: '#030712',
      darkSurface: '#111827',
      darkText: '#f9fafb',
      darkTextSecondary: '#9ca3af',
      lightBackground: '#e5e7eb',
      lightSurface: '#f3f4f6',
      lightText: '#111827',
      lightTextSecondary: '#4b5563',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
  {
    id: 'turquoise',
    colors: {
      accent: '#14b8a6',
      darkBackground: '#0a1614',
      darkSurface: '#134e4a',
      darkText: '#f0fdfa',
      darkTextSecondary: '#5eead4',
      lightBackground: '#ccfbf1',
      lightSurface: '#f0fdfa',
      lightText: '#134e4a',
      lightTextSecondary: '#0f766e',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
  },
];
