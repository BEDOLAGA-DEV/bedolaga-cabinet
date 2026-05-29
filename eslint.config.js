import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'public'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/variables': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      // Cross-platform guard: these browser APIs misbehave inside the Telegram WebView.
      // Route them through the platform abstraction instead. The platform adapters and
      // the clipboard util (the canonical implementations) are exempted below.
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'confirm',
          message:
            'Use useNativeDialog().confirm — window.confirm is silently ignored in the Telegram WebView.',
        },
        {
          object: 'window',
          property: 'alert',
          message:
            'Use useNativeDialog().alert — window.alert is silently ignored in the Telegram WebView.',
        },
        {
          object: 'window',
          property: 'open',
          message:
            'Use usePlatform().openLink / openTelegramLink — window.open is intercepted by the Telegram WebView.',
        },
        {
          object: 'window',
          property: 'prompt',
          message:
            'Use usePrompt() (PromptDialogHost) — window.prompt is not supported in the Telegram WebView.',
        },
        {
          object: 'navigator',
          property: 'clipboard',
          message:
            'Use copyToClipboard from @/utils/clipboard — it falls back to execCommand when the Clipboard API is unavailable (Telegram WebView).',
        },
      ],
    },
  },
  {
    // Canonical implementations that intentionally call the restricted browser APIs.
    files: ['src/platform/**/*.{ts,tsx}', 'src/utils/clipboard.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  eslintConfigPrettier,
);
