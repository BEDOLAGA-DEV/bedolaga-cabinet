import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get version from Git tag or fallback to 'dev'
function getGitVersion(): string {
  try {
    // Try to get version from git tag
    return execSync('git describe --tags --always', { encoding: 'utf-8' }).trim()
  } catch {
    return 'dev'
  }
}

const appVersion = process.env.VITE_APP_VERSION || getGitVersion()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
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
  },
})
