import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the app build config stays untouched;
// utility tests run in a plain node environment (no jsdom needed).
export default defineConfig({
  // Тот же алиас, что и в vite.config.ts. Без него `import { x } from '@/...'`
  // падает в рантайме теста: существующие тесты этого не замечали, потому что
  // используют только `import type`, а он стирается на компиляции.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
