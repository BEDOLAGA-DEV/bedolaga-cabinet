import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    css: false,
    restoreMocks: true,
    clearMocks: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
