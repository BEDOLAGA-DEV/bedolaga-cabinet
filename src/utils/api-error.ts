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

/**
 * True when the backend answered 429 — the caller hit a rate limit and should
 * say «слишком часто, попробуйте позже» rather than «не удалось отправить».
 */
export function isRateLimitedError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 429;
}

/** Machine-readable reason, kept separate from user-facing error text. */
export function getApiErrorCode(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const detail = err.response?.data?.detail;
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return undefined;
  return typeof detail.code === 'string' ? detail.code : undefined;
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
    // Структурные ошибки бэка ({code, message, ...}: 428 «нужно согласие», 403
    // maintenance и т.п.) — берём message. Объект в тексте ошибки роняет React (#31).
    if (detail && typeof detail === 'object') {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return fallback;
  }
  return fallback;
}

/** A missing response or gateway failure cannot establish whether a purchase committed. */
export function isUncertainPurchaseOutcome(err: unknown): boolean {
  return (
    axios.isAxiosError(err) && (!err.response || [502, 503, 504].includes(err.response.status))
  );
}
