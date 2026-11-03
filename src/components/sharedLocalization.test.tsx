// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n, { i18nReady } from '../i18n';
import en from '../locales/en.json';
import fa from '../locales/fa.json';
import { ErrorBoundary } from './ErrorBoundary';
import { ColorPicker } from './ColorPicker';

beforeAll(async () => {
  await i18nReady;
  i18n.addResourceBundle('en', 'translation', en, true, true);
  i18n.addResourceBundle('fa', 'translation', fa, true, true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function BrokenWidget(): never {
  throw new Error('Synthetic test failure');
}

describe('shared UI localization', () => {
  it.each([
    ['en', 'Failed to load this section', 'Retry'],
    ['fa', 'بارگیری این بخش ناموفق بود', fa.common.retry],
  ])('renders the widget crash fallback in %s', async (language, message, retry) => {
    await i18n.changeLanguage(language);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary level="widget">
        <BrokenWidget />
      </ErrorBoundary>,
    );
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByRole('button', { name: retry })).toBeTruthy();
    expect(screen.queryByText('Synthetic test failure')).toBeNull();
  });

  it.each([
    ['en', 'Hue', 'Saturation', 'Lightness'],
    ['fa', 'فام', 'اشباع', 'روشنی'],
  ])(
    'localizes color slider accessible names in %s',
    async (language, hue, saturation, lightness) => {
      await i18n.changeLanguage(language);
      render(
        <I18nextProvider i18n={i18n}>
          <ColorPicker value="#2266aa" onChange={() => {}} label="Color" />
        </I18nextProvider>,
      );
      fireEvent.click(screen.getByRole('button'));
      for (const name of [hue, saturation, lightness]) {
        expect(screen.getByRole('slider', { name })).toBeTruthy();
      }
    },
  );
});
