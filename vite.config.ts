import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Base path - use '/' for standalone Docker deployment
  // Change to '/cabinet/' if serving from a sub-path
  base: '/',
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Strip /api prefix: /api/cabinet/auth -> /cabinet/auth
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-motion': ['framer-motion'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-switch',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-slot',
            '@radix-ui/react-visually-hidden',
          ],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-telegram': ['@telegram-apps/sdk-react'],
          'vendor-utils': [
            'axios',
            'zustand',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'dompurify',
          ],
          'vendor-lottie': ['@lottiefiles/dotlottie-react'],
          'vendor-webgl': ['ogl'],
          'vendor-cmdk': ['cmdk'],
        },
      },
    },
  },
});
