import { AxiosError, AxiosHeaders } from 'axios';

export const CONSENT_DOCUMENTS = ['public_offer', 'privacy_policy'];

/**
 * Ответ бэка 428 на первый вход нового пользователя: без галочек «ознакомлен»
 * аккаунт не создаётся. detail здесь — объект, а не строка, и любой экран,
 * который кладёт его в текст ошибки как есть, роняет дерево React (#31).
 */
export function consentRequiredError(prechecked = false): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers };
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status: 428,
      statusText: 'Precondition Required',
      headers,
      config,
      data: {
        detail: {
          code: 'legal_consent_required',
          message: 'Consent to the legal documents is required to create an account',
          documents: CONSENT_DOCUMENTS,
          missing: CONSENT_DOCUMENTS,
          prechecked,
        },
      },
    },
  );
}
