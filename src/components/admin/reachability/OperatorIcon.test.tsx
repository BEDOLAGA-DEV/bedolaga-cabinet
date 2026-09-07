// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OperatorIcon } from './OperatorIcon';

afterEach(cleanup);

describe('OperatorIcon', () => {
  it('известный оператор — картинка, скрытая от скринридера (имя рядом)', () => {
    render(<OperatorIcon operator="mts" />);
    const img = screen.getByRole('presentation', { hidden: true }) as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toContain('mts');
  });

  it('неизвестный оператор — заглушка с первой буквой', () => {
    render(<OperatorIcon operator="newop" />);
    expect(screen.getByText('N')).toBeTruthy();
    expect(screen.queryByRole('presentation', { hidden: true })).toBeNull();
  });
});
