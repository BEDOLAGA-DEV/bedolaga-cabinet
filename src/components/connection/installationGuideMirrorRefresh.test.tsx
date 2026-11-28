// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import InstallationGuide from './InstallationGuide';
import type { AppConfig } from '@/types';
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isLight: false }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
afterEach(cleanup);
it('drops an old app and its old import when refreshed config no longer contains it', async () => {
  const config = (name: string, title: string): AppConfig => ({
    hasSubscription: true,
    subscriptionUrl: 'https://primary.example/sub/fresh',
    platformNames: { ios: { en: 'iOS' } },
    platforms: {
      ios: { apps: [{ name, blocks: [{ title: { en: title }, description: { en: '' } }] }] },
    },
  });
  const props = { onOpenDeepLink: vi.fn(), isTelegramWebApp: false, onGoBack: vi.fn() };
  const view = render(
    <InstallationGuide {...props} appConfig={config('Old app', 'Old instruction')} />,
  );
  expect(await screen.findByText('Old instruction')).toBeTruthy();
  view.rerender(<InstallationGuide {...props} appConfig={config('New app', 'New instruction')} />);
  expect(screen.queryByText('Old instruction')).toBeNull();
  expect(await screen.findByText('New instruction')).toBeTruthy();
});
