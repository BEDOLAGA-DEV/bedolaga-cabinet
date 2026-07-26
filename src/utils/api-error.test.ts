import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, isEndpointMissingError } from './api-error';

function axiosErrorWithStatus(status: number, detail?: unknown): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers };
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: '',
      headers,
      config,
      data: detail === undefined ? {} : { detail },
    },
  );
}

describe('isEndpointMissingError', () => {
  it('returns true for an axios 404', () => {
    expect(isEndpointMissingError(axiosErrorWithStatus(404))).toBe(true);
  });

  it('returns false for other axios statuses', () => {
    expect(isEndpointMissingError(axiosErrorWithStatus(403))).toBe(false);
    expect(isEndpointMissingError(axiosErrorWithStatus(500))).toBe(false);
  });

  it('returns false for non-axios errors', () => {
    expect(isEndpointMissingError(new Error('boom'))).toBe(false);
    expect(isEndpointMissingError(undefined)).toBe(false);
    expect(isEndpointMissingError(null)).toBe(false);
  });
});

describe('getApiErrorMessage', () => {
  it('returns string detail from an axios error', () => {
    expect(getApiErrorMessage(axiosErrorWithStatus(400, 'Code must not be empty'), 'fb')).toBe(
      'Code must not be empty',
    );
  });

  it('joins pydantic validation errors', () => {
    const err = axiosErrorWithStatus(422, [
      { loc: ['body', 'name'], msg: 'field required' },
      { loc: ['body', 'days'], msg: 'must be positive' },
    ]);
    expect(getApiErrorMessage(err, 'fb')).toBe('name: field required; days: must be positive');
  });

  it('falls back for non-axios errors and missing detail', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fb')).toBe('fb');
    expect(getApiErrorMessage(axiosErrorWithStatus(500), 'fb')).toBe('fb');
  });
});
