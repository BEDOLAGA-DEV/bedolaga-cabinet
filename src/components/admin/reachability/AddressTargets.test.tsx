// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Вкладка «IP / домен» как в оригинале: до 10 целей через запятую или с новой строки. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { AddressTargets } from './AddressTargets';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

describe('AddressTargets', () => {
  it('поле подписано, считает цели и предупреждает о лишних сверх десяти', () => {
    const text = Array.from({ length: 12 }, (_, i) => `10.0.0.${i}`).join(', ');
    renderWithProviders(<AddressTargets value={text} onChange={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: 'Адреса' }) as HTMLTextAreaElement;
    expect(field.value).toBe(text);
    expect(field.placeholder).toContain('до 10 целей через запятую или с новой строки');
    expect(screen.getByText('10 целей')).toBeTruthy();
    expect(screen.getByText(/лишних адресов: 2/)).toBeTruthy();
  });

  it('ввод уходит наверх как есть', () => {
    const onChange = vi.fn();
    renderWithProviders(<AddressTargets value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Адреса' }), {
      target: { value: 'ya.ru\n77.88.8.8' },
    });
    expect(onChange).toHaveBeenCalledWith('ya.ru\n77.88.8.8');
    expect(screen.getByText('0 целей')).toBeTruthy();
  });
});
