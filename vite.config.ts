import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
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
        manualChunks(id) {
          if (id.includes('/src/locales/')) return 'locales';
          if (!id.includes('node_modules')) return;
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('node_modules/react/')
          )
            return 'vendor-react';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('@tanstack/react-table')) return 'vendor-table';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@radix-ui/')) return 'vendor-radix';
          if (id.includes('@dnd-kit/')) return 'vendor-dnd';
          if (id.includes('@telegram-apps/') || id.includes('/@tma.js/')) return 'vendor-telegram';
          if (id.includes('/ogl/')) return 'vendor-webgl';
          if (id.includes('/cmdk/')) return 'vendor-cmdk';
          if (id.includes('twemoji') || id.includes('@twemoji/')) return 'vendor-twemoji';
          if (id.includes('/jsencrypt/') || id.includes('@kastov/')) return 'vendor-crypto';
          if (id.includes('@lottiefiles/')) return 'vendor-lottie';
          if (
            id.includes('/axios/') ||
            id.includes('/zustand/') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/') ||
            id.includes('class-variance-authority') ||
            id.includes('/dompurify/')
          )
            return 'vendor-utils';
        },
      },
    },
  },
});
