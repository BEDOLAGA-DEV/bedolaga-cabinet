// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** На телефоне матрица «хост × симка» — список: хост, под ним чипы симок с вердиктом. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { VerdictChipList } from './VerdictChipList';

afterEach(cleanup);

describe('VerdictChipList', () => {
  it('рисует по чипу на симку с вердиктом и отдаёт выбранную ячейку', () => {
    const onSelect = vi.fn();
    render(
      <VerdictChipList
        rows={[
          {
            key: 'bs.example:443',
            label: 'RU-BS',
            sub: 'bs.example:443',
            cells: [
              { key: 'mts|цфо|on', label: 'mts · ЦФО', verdict: 'reachable', matches: true },
              { key: 'tele2|цфо|on', label: 'tele2 · ЦФО', verdict: 'blocked', matches: false },
            ],
          },
        ]}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('RU-BS')).toBeTruthy();
    const blocked = screen.getByRole('button', { name: /tele2 · ЦФО.*режется/ });
    fireEvent.click(blocked);
    expect(onSelect).toHaveBeenCalledWith('bs.example:443', 'tele2|цфо|on');
  });
});
