// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Location, Pop } from '@/api/dpichecker';
import { PopPicker } from './PopPicker';
import { renderWithProviders } from './testUtils';

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

const RU: Pop[] = [
  { id: 1, location: 'russia', region: 'Москва', operator: null, is_healthy: true },
  { id: 2, location: 'russia', region: 'Москва', operator: 'MTS', is_healthy: true },
  { id: 3, location: 'russia', region: 'Амурская обл.', operator: null, is_healthy: false },
];
const CN: Pop[] = [
  { id: 50, location: 'china', region: 'Beijing', operator: 'ChinaMobile', is_healthy: true },
];

vi.mock('@/api/dpichecker', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/dpichecker')>();
  return {
    ...original,
    dpicheckerApi: {
      getPops: vi.fn(async (location: Location) =>
        location === 'russia'
          ? {
              pops: RU,
              groups: {
                districts: [{ code: 'CFD', name: 'Центральный ФО', pop_ids: [1, 2] }],
                republics: [],
              },
            }
          : { pops: CN, groups: { districts: [], republics: [] } },
      ),
      getOptimal: vi.fn(async () => [2, 3]),
    },
  };
});

const seen: number[][] = [];

function Harness({ initial = 'russia' as Location }) {
  const [location, setLocation] = useState<Location>(initial);
  const [selected, setSelected] = useState(new Set<number>());
  return (
    <PopPicker
      location={location}
      onLocation={setLocation}
      selected={selected}
      onSelected={(next) => {
        seen.push([...next].sort());
        setSelected(next);
      }}
    />
  );
}

afterEach(() => {
  cleanup();
  seen.length = 0;
});

it('«Оптимальный выбор» берёт набор сервиса без нерабочих точек', async () => {
  renderWithProviders(<Harness />);
  await screen.findByText('Москва');
  const optimal = screen.getByRole('button', { name: /Оптимальный выбор/ });
  await waitFor(() => expect((optimal as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(optimal);
  await waitFor(() => expect(seen.at(-1)).toEqual([2]));
});

it('округ выбирает свои рабочие точки, повторный клик снимает', async () => {
  renderWithProviders(<Harness />);
  const district = await screen.findByRole('button', { name: 'Центральный ФО' });
  fireEvent.click(district);
  expect(seen.at(-1)).toEqual([1, 2]);
  fireEvent.click(district);
  expect(seen.at(-1)).toEqual([]);
});

it('нерабочая точка недоступна', async () => {
  renderWithProviders(<Harness />);
  await screen.findByText('Амурская обл.');
  const dead = screen
    .getAllByRole('button', { name: 'Любой' })
    .find((b) => (b as HTMLButtonElement).disabled);
  expect(dead).toBeTruthy();
});

it('для Китая округов нет', async () => {
  renderWithProviders(<Harness initial="china" />);
  await screen.findByText('Beijing');
  expect(screen.queryByRole('group', { name: /Округа/ })).toBeNull();
});
