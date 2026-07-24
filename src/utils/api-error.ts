import axios from 'axios';

/**
 * True when the backend answered 404 on the route itself — for cabinet
 * endpoints that means the bot build is too old to have them (e.g. the
 * deep-link auth routes exist only since bot v3.33.0), as opposed to a
 * missing entity inside a handler.
 */
export function isEndpointMissingError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    // Pydantic V2 validation errors: [{type, loc, msg, input, ctx}]
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((e: { loc?: (string | number)[]; msg?: string }) => {
          const field = e.loc?.filter((s) => s !== 'body').join('.') ?? '';
          return field ? `${field}: ${e.msg}` : (e.msg ?? '');
        })
        .join('; ');
    }
    return fallback;
  }
  return fallback;
}
