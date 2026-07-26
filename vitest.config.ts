import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the app build config stays untouched;
// utility tests run in a plain node environment (no jsdom needed).
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
