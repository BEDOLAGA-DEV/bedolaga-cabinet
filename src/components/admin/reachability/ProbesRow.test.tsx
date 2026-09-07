// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Пробы подписаны как в оригинале: ICMP, TCP, TLS-SNI — с пояснением, что каждая делает. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { ProbesRow } from './ProbesRow';

afterEach(cleanup);

describe('ProbesRow', () => {
  it('TLS-SNI с пояснением, переключение отдаёт новый набор', () => {
    const onChange = vi.fn();
    render(<ProbesRow probes={{ icmp: false, tcp: true, sni: true }} onChange={onChange} />);
    const sni = screen.getByRole('button', { name: /^TLS-SNI/ });
    expect(sni.textContent).toContain('TLS-рукопожатие по SNI');
    expect(sni.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^ICMP/ }).textContent).toContain('ping · 3 пакета');
    fireEvent.click(sni);
    expect(onChange).toHaveBeenCalledWith({ icmp: false, tcp: true, sni: false });
  });

  it('нажатая проба помечена галочкой, ненажатая — нет', () => {
    render(<ProbesRow probes={{ icmp: false, tcp: true, sni: true }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^TCP/ }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('button', { name: /^ICMP/ }).querySelector('svg')).toBeNull();
  });

  it('заблокированная проба не переключается', () => {
    const onChange = vi.fn();
    render(
      <ProbesRow
        probes={{ icmp: true, tcp: true, sni: false }}
        onChange={onChange}
        locked={['sni']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^TLS-SNI/ }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
