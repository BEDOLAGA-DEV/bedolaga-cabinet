/** @type {import('tailwindcss').Config} */

// Helper function to create color with opacity support using CSS variables
const withOpacity = (variableName, fallback) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern neutral palette
        dark: {
          50: withOpacity('--color-dark-50'),
          100: withOpacity('--color-dark-100'),
          200: withOpacity('--color-dark-200'),
          300: withOpacity('--color-dark-300'),
          400: withOpacity('--color-dark-400'),
          500: withOpacity('--color-dark-500'),
          600: withOpacity('--color-dark-600'),
          700: withOpacity('--color-dark-700'),
          800: withOpacity('--color-dark-800'),
          850: withOpacity('--color-dark-850'),
          900: withOpacity('--color-dark-900'),
          950: withOpacity('--color-dark-950'),
        },
        // Champagne light theme palette
        champagne: {
          50: withOpacity('--color-champagne-50'),
          100: withOpacity('--color-champagne-100'),
          200: withOpacity('--color-champagne-200'),
          300: withOpacity('--color-champagne-300'),
          400: withOpacity('--color-champagne-400'),
          500: withOpacity('--color-champagne-500'),
          600: withOpacity('--color-champagne-600'),
          700: withOpacity('--color-champagne-700'),
          800: withOpacity('--color-champagne-800'),
          900: withOpacity('--color-champagne-900'),
          950: withOpacity('--color-champagne-950'),
        },
        // Accent - dynamic color scheme
        accent: {
          50: withOpacity('--color-accent-50'),
          100: withOpacity('--color-accent-100'),
          200: withOpacity('--color-accent-200'),
          300: withOpacity('--color-accent-300'),
          400: withOpacity('--color-accent-400'),
          500: withOpacity('--color-accent-500'),
          600: withOpacity('--color-accent-600'),
          700: withOpacity('--color-accent-700'),
          800: withOpacity('--color-accent-800'),
          900: withOpacity('--color-accent-900'),
          950: withOpacity('--color-accent-950'),
        },
        // Success - green
        success: {
          50: withOpacity('--color-success-50'),
          100: withOpacity('--color-success-100'),
          200: withOpacity('--color-success-200'),
          300: withOpacity('--color-success-300'),
          400: withOpacity('--color-success-400'),
          500: withOpacity('--color-success-500'),
          600: withOpacity('--color-success-600'),
          700: withOpacity('--color-success-700'),
          800: withOpacity('--color-success-800'),
          900: withOpacity('--color-success-900'),
          950: withOpacity('--color-success-950'),
        },
        // Warning - amber
        warning: {
          50: withOpacity('--color-warning-50'),
          100: withOpacity('--color-warning-100'),
          200: withOpacity('--color-warning-200'),
          300: withOpacity('--color-warning-300'),
          400: withOpacity('--color-warning-400'),
          500: withOpacity('--color-warning-500'),
          600: withOpacity('--color-warning-600'),
          700: withOpacity('--color-warning-700'),
          800: withOpacity('--color-warning-800'),
          900: withOpacity('--color-warning-900'),
          950: withOpacity('--color-warning-950'),
        },
        // Error - red
        error: {
          50: withOpacity('--color-error-50'),
          100: withOpacity('--color-error-100'),
          200: withOpacity('--color-error-200'),
          300: withOpacity('--color-error-300'),
          400: withOpacity('--color-error-400'),
          500: withOpacity('--color-error-500'),
          600: withOpacity('--color-error-600'),
          700: withOpacity('--color-error-700'),
          800: withOpacity('--color-error-800'),
          900: withOpacity('--color-error-900'),
          950: withOpacity('--color-error-950'),
        },
      },
      fontFamily: {
        sans: [
          'Manrope',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        bento: '24px',
        '4xl': '32px',
        // Linear design tokens
        linear: '8px',
        'linear-lg': '12px',
      },
      spacing: {
        bento: '16px',
        'bento-lg': '24px',
        // Linear design tokens
        'linear-xs': '4px',
        'linear-sm': '8px',
        'linear-md': '16px',
        'linear-lg': '24px',
        'linear-xl': '32px',
      },
      backdropBlur: {
        linear: '12px',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        glow: '0 0 20px rgba(var(--color-accent-500), 0.15)',
        'glow-lg': '0 0 40px rgba(var(--color-accent-500), 0.2)',
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
        card: '0 4px 24px -4px rgba(0, 0, 0, 0.4)',
        // Linear design tokens
        'linear-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        linear: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'linear-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'linear-glow': '0 0 0 1px rgba(var(--color-accent-500), 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-subtle': 'linear-gradient(135deg, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-fast': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in-bounce': 'scaleInBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        spotlight: 'spotlight 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleInBounce: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(var(--color-accent-500), 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(var(--color-accent-500), 0.6)' },
        },
        spotlight: {
          '0%, 100%': {
            boxShadow:
              '0 0 0 4px rgba(var(--color-accent-500), 0.4), 0 0 20px rgba(var(--color-accent-500), 0.3)',
          },
          '50%': {
            boxShadow:
              '0 0 0 8px rgba(var(--color-accent-500), 0.2), 0 0 40px rgba(var(--color-accent-500), 0.5)',
          },
        },
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
