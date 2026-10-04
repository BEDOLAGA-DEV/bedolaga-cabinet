import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import packageJson from './package.json' with { type: 'json' };
import { brandingHtml } from './vite-plugins/brandingHtml.ts';

// Vendor-чанки: [имя, какие модули в него идут]. Порядок = приоритет группы.
// Rolldown по умолчанию забирает в группу и все зависимости её модулей, поэтому
// базовые чанки (react, utils) стоят первыми: общие пакеты (clsx,
// use-sync-external-store) должны достаться им, а не тяжёлым ленивым
// recharts/tiptap — иначе стартовая страница тянет чанк графиков.
const VENDOR_CHUNKS: ReadonlyArray<readonly [string, RegExp]> = [
  ['vendor-react', /node_modules\/(react|react-dom|react-router|scheduler)\//],
  [
    'vendor-utils',
    /node_modules\/(axios|zustand|clsx|tailwind-merge|class-variance-authority|dompurify)\//,
  ],
  ['vendor-query', /@tanstack\/react-query/],
  ['vendor-i18n', /i18next/],
  ['vendor-motion', /framer-motion/],
  ['vendor-radix', /@radix-ui\//],
  ['vendor-telegram', /@telegram-apps\/|\/@tma\.js\//],
  ['vendor-twemoji', /node_modules\/.*twemoji/],
  ['vendor-crypto', /\/jsencrypt\/|@kastov\//],
  ['vendor-cmdk', /\/cmdk\//],
  ['vendor-dnd', /@dnd-kit\//],
  ['vendor-table', /@tanstack\/react-table/],
  ['vendor-webgl', /\/ogl\//],
  ['vendor-lottie', /@lottiefiles\//],
  // Heavy admin-only deps — split so they don't bloat the shared
  // chunks of other lazy admin pages that don't use them.
  ['vendor-recharts', /\/recharts\/|\/d3-/],
  ['vendor-tiptap', /@tiptap\/|\/prosemirror-/],
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Переменные из .env и из окружения сборки (Docker передаёт их через ENV);
  // окружение сильнее файла — как и у самого Vite.
  const env = { ...loadEnv(mode, import.meta.dirname, 'VITE_'), ...process.env };
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [
      react(),
      brandingHtml({
        name: env.VITE_APP_NAME ?? '',
        apiUrl: env.VITE_API_URL ?? '',
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
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
          target: proxyTarget,
          changeOrigin: true,
          // Strip /api prefix: /api/cabinet/auth -> /cabinet/auth
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // The backend serves its liveness endpoint at the host root (not under
        // /api). Proxy it too so the "service unavailable" detection probe hits the
        // real backend in dev instead of the Vite server (which would mask outages).
        '/health': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 550,
      rolldownOptions: {
        // Barrel-файлы src/**/index.ts(x) — чистые реэкспорты без побочных эффектов.
        // Без этой пометки Rolldown считает их побочными, и неиспользуемый
        // реэкспорт тянет модуль в стартовый чанк: StatCard из '@/components/stats'
        // на дашборде приводил в стартовую загрузку DailyChart и весь recharts.
        treeshake: {
          moduleSideEffects: (id: string) =>
            /\/src\/.+\/index\.tsx?$/.test(id) ? false : undefined,
        },
        output: {
          codeSplitting: {
            groups: VENDOR_CHUNKS.map(([name, test], index) => ({
              name,
              test,
              priority: VENDOR_CHUNKS.length - index,
            })),
          },
        },
      },
    },
  };
});
