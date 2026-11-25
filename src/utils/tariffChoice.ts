/**
 * Мультитариф: тариф подарка или покупки у человека уже есть. Бэкенд отвечает
 * 409 `tariff_choice_required` со списком живых подписок тарифа, и активацию
 * повторяют с ответом: добавить дни к одной из них или активировать отдельной
 * подпиской (копией тарифа).
 */
export interface TariffChoiceSubscription {
  id: number;
  end_date: string;
}

/** Ответ на вопрос; без него бэкенд спрашивает, если клиент передал `ask_tariff_choice`. */
export type TariffChoiceAnswer = { target_subscription_id: number } | { as_copy: true };

export function tariffChoiceFromError(error: unknown): TariffChoiceSubscription[] | null {
  const detail = (
    error as {
      response?: { status?: number; data?: { detail?: unknown } };
    }
  )?.response;
  if (detail?.status !== 409) return null;
  const body = detail.data?.detail as
    | { code?: string; subscriptions?: TariffChoiceSubscription[] }
    | undefined;
  if (!body || body.code !== 'tariff_choice_required' || !Array.isArray(body.subscriptions)) {
    return null;
  }
  return body.subscriptions.filter(
    (subscription) =>
      typeof subscription?.id === 'number' &&
      subscription.id > 0 &&
      typeof subscription.end_date === 'string',
  );
}
