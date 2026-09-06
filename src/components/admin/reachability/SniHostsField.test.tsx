// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Поле «SNI-хост»: свои имена важнее имён целей; без тех и других — предупреждение. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { SniHostsField } from './SniHostsField';

afterEach(cleanup);

describe('SniHostsField', () => {
  it('показывает, какие имена уйдут: свои, иначе имена целей', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SniHostsField value="" onChange={onChange} autoNames={['eu-host.example']} />,
    );
    expect(screen.getByText('1 eu-host.example')).toBeTruthy();
    expect(screen.getByText('взяты из целей')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'SNI-хост' }), {
      target: { value: 'ads.x5.ru, vk.com' },
    });
    expect(onChange).toHaveBeenCalledWith('ads.x5.ru, vk.com');
    rerender(<SniHostsField value="ads.x5.ru, vk.com" onChange={onChange} autoNames={[]} />);
    expect(screen.getByText('1 ads.x5.ru · 2 vk.com')).toBeTruthy();
    expect(screen.queryByText('взяты из целей')).toBeNull();
  });

  it('без имён и без целей с доменом предупреждает, IP в поле помечает', () => {
    const { rerender } = render(<SniHostsField value="" onChange={vi.fn()} autoNames={[]} />);
    expect(screen.getByText(/Укажите SNI-хост/)).toBeTruthy();
    rerender(<SniHostsField value="203.0.113.10" onChange={vi.fn()} autoNames={[]} />);
    expect(screen.getByRole('textbox', { name: 'SNI-хост' }).getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(screen.getByText(/Не похоже на домен/)).toBeTruthy();
  });
});
