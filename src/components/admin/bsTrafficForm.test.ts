import { expect, it } from 'vitest';
import { bsTrafficFormState, parseBsTrafficForm } from './bsTrafficForm';

const settings = {
  squad_uuids: ['one'],
  limit_gb: 10,
  topup_enabled: true,
  topup_packages: { '5': 12345 },
  max_topup_gb: 0,
};

it('roundtrips kopeks and unlimited without losing terms', () => {
  expect(parseBsTrafficForm(bsTrafficFormState(settings), [])).toEqual(settings);
  expect(
    parseBsTrafficForm(bsTrafficFormState({ ...settings, limit_gb: 0, topup_enabled: false }), [])
      ?.limit_gb,
  ).toBe(0);
  expect(parseBsTrafficForm(null, [])).toBeNull();
});

it('rejects incomplete input, overlapping squads, duplicate sizes and fractional kopeks', () => {
  const state = bsTrafficFormState(settings);
  if (!state) throw new Error('Expected initialized form');
  expect(parseBsTrafficForm({ ...state, limitGb: '' }, [])).toBeUndefined();
  expect(parseBsTrafficForm(state, ['one'])).toBeUndefined();
  expect(
    parseBsTrafficForm({ ...state, packages: [...state.packages, ...state.packages] }, []),
  ).toBeUndefined();
  expect(
    parseBsTrafficForm({ ...state, packages: [{ gb: '5', rubles: '1.001' }] }, []),
  ).toBeUndefined();
});

it('preserves disabled saved terms and allows re-enabling without rebuilding them', () => {
  const disabled = { ...settings, enabled: false };
  const form = bsTrafficFormState(disabled);
  if (!form) throw new Error('Expected saved form');
  expect(form.enabled).toBe(false);
  expect(parseBsTrafficForm(form, [])).toEqual(disabled);
  expect(parseBsTrafficForm({ ...form, enabled: true }, [])).toEqual({
    ...settings,
    enabled: true,
  });
});

it('can abandon a newly opened empty BS configuration', () => {
  expect(
    parseBsTrafficForm(
      {
        enabled: false,
        squads: [],
        limitGb: '10',
        topupEnabled: false,
        maxTopupGb: '0',
        packages: [],
      },
      [],
    ),
  ).toBeNull();
});
