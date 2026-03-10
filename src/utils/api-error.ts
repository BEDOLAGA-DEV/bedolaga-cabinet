import axios from 'axios';

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
