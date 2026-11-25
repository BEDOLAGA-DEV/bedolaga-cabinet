import { describe, expect, it } from 'vitest';
import { tariffChoiceFromError } from './tariffChoice';

function apiError(status: number, detail: unknown) {
  return { response: { status, data: { detail } } };
}

describe('tariffChoiceFromError', () => {
  it('читает список подписок из ответа 409 tariff_choice_required', () => {
    const error = apiError(409, {
      code: 'tariff_choice_required',
      subscriptions: [
        { id: 5, end_date: '2026-12-31T00:00:00+00:00' },
        { id: 7, end_date: '2027-01-03T09:05:00+00:00' },
      ],
    });
    expect(tariffChoiceFromError(error)).toEqual([
      { id: 5, end_date: '2026-12-31T00:00:00+00:00' },
      { id: 7, end_date: '2027-01-03T09:05:00+00:00' },
    ]);
  });

  it('прочие ошибки — не вопрос', () => {
    expect(tariffChoiceFromError(apiError(409, 'This gift has already been claimed'))).toBeNull();
    expect(tariffChoiceFromError(apiError(400, { code: 'tariff_choice_required' }))).toBeNull();
    expect(tariffChoiceFromError(new Error('network'))).toBeNull();
    expect(tariffChoiceFromError(undefined)).toBeNull();
  });

  it('отбрасывает записи без id или даты окончания', () => {
    const date = '2026-12-31T00:00:00+00:00';
    const error = apiError(409, {
      code: 'tariff_choice_required',
      subscriptions: [
        { id: 0, end_date: date },
        { end_date: date },
        { id: 4 },
        { id: 3, end_date: date },
      ],
    });
    expect(tariffChoiceFromError(error)).toEqual([{ id: 3, end_date: date }]);
  });
});
