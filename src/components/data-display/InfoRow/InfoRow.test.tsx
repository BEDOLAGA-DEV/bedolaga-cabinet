// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InfoRow } from './InfoRow';

describe('InfoRow', () => {
  it('подпись и значение разведены зазором, длинное значение переносится, а не выталкивает соседей', () => {
    render(<InfoRow label="Email" value="aleksandr.konstantinopolsky.1998@protonmail.com" />);

    const label = screen.getByText('Email');
    const value = screen.getByText('aleksandr.konstantinopolsky.1998@protonmail.com');
    const row = label.parentElement as HTMLElement;

    expect(row.className).toMatch(/\bgap-/);
    expect(label.className).toContain('shrink-0');
    // Без min-w-0 элемент flex-ряда не уже своего содержимого — длинная почта
    // уводила строку за край карточки.
    const valueBox = value.closest('[data-info-value]') as HTMLElement;
    expect(valueBox.className).toContain('min-w-0');
    // break-words не уменьшает минимальную ширину слова — почта без пробелов
    // всё равно распирала бы строку; anywhere — уменьшает.
    expect(valueBox.className).toContain('[overflow-wrap:anywhere]');
  });

  it('разделитель — по желанию, значение может быть разметкой', () => {
    render(<InfoRow divider label="Статус" value={<span data-testid="badge">Подтверждён</span>} />);
    const row = screen.getByText('Статус').parentElement as HTMLElement;
    expect(row.className).toContain('border-b');
    expect(screen.getByTestId('badge')).toBeTruthy();
  });
});
