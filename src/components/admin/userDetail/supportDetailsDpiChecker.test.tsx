// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../dpichecker/testUtils';
import { SupportDetails } from './SupportDetails';

/** У ссылки подписки — кнопка «Проверить в DPI//CHECKER», когда раздел доступен админу. */

vi.mock('react-i18next', async () => (await import('../dpichecker/testUtils')).i18nMock());

const PANEL = { found: true, subscription_url: 'https://sub.example/abc' } as never;

afterEach(() => cleanup());

it('кнопка ведёт в DPI//CHECKER с подпиской пользователя', () => {
  renderWithProviders(
    <SupportDetails
      userId={42}
      subscriptionId={null}
      panelInfo={PANEL}
      remnawaveId={null}
      reachabilityLink={null}
      dpicheckerLink="/admin/dpichecker?tab=vpn&source=user&ref=42"
    />,
  );
  const link = screen.getByRole('link', { name: /DPI\/\/CHECKER/ });
  expect(link.getAttribute('href')).toBe('/admin/dpichecker?tab=vpn&source=user&ref=42');
});

it('без доступа кнопки нет', () => {
  renderWithProviders(
    <SupportDetails
      userId={42}
      subscriptionId={null}
      panelInfo={PANEL}
      remnawaveId={null}
      reachabilityLink={null}
      dpicheckerLink={null}
    />,
  );
  expect(screen.queryByRole('link', { name: /DPI\/\/CHECKER/ })).toBeNull();
});
