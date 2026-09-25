// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';

/**
 * Шит на телефоне: не залезает под шапку Telegram (высота из отступов SDK), даёт место
 * полоске Home и закрывается кнопкой в заголовке, а не только жестом.
 */

vi.mock('react-i18next', async () =>
  (await import('@/components/admin/reachability/testUtils')).i18nMock(),
);
vi.mock('@/hooks/useHeaderHeight', () => ({
  useHeaderHeight: () => ({
    mobile: 168,
    mobileCss: '168px',
    desktop: 56,
    topSafeArea: 104,
    bottomSafeArea: 34,
    isMobileFullscreen: true,
  }),
}));

import { Sheet } from './Sheet';

afterEach(cleanup);

describe('Sheet', () => {
  it('ограничивает высоту отступом Telegram сверху и добавляет отступ снизу', () => {
    render(
      <PlatformProvider>
        <Sheet isOpen onClose={vi.fn()} title="Сервер">
          <p>тело</p>
        </Sheet>
      </PlatformProvider>,
    );
    const sheet = screen.getByRole('dialog');
    expect(sheet.style.maxHeight).toBe(
      'calc(var(--tg-viewport-stable-height, 100dvh) * 1 - 112px)',
    );
    expect(sheet.style.paddingBottom).toBe('max(env(safe-area-inset-bottom, 0px), 34px)');
  });

  it('кнопка «Закрыть» в заголовке закрывает шит', () => {
    const onClose = vi.fn();
    render(
      <PlatformProvider>
        <Sheet isOpen onClose={onClose} title="Сервер">
          <p>тело</p>
        </Sheet>
      </PlatformProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalled();
  });
});
