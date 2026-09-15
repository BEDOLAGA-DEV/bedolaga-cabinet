import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMoney } from '@/components/admin/users/useMoney';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import { adminErrorText } from './adminErrors';

/** Ответ ручек вида `{ success: false, message }` — отказ без HTTP-ошибки. */
class ActionRefused extends Error {}

function assertAccepted(result: unknown): void {
  if (result && typeof result === 'object' && 'success' in result) {
    const { success, message } = result as { success?: unknown; message?: unknown };
    if (success === false) throw new ActionRefused(typeof message === 'string' ? message : '');
  }
}

export interface ActionOptions<T> {
  /**
   * Тост после успеха; без него — молча. Функция получает ответ сервера: «продлено
   * до 13.01.2027» берёт новую дату из ответа, а не устаревшую из карточки.
   */
  success?: string | ((result: T) => string);
  /** Что перечитать после успеха: карточка, устройства, сверка с панелью. */
  after?: () => Promise<unknown> | unknown;
  /** Успех с оговоркой (сервер применил, но предупредил) — отдельным предупреждением. */
  warning?: (result: T) => string | null;
}

/**
 * Одно место для действий админа в карточке: занятость кнопок, понятная ошибка
 * (ответ сервера словами, см. `adminErrorText`) и тост успеха. Раньше половина обработчиков
 * глотала ошибку в console.error — админ жал «Заблокировать» и не видел ничего.
 */
export function useAdminAction() {
  const { t } = useTranslation();
  const notify = useNotify();
  const money = useMoney();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const run = useCallback(
    async <T>(task: () => Promise<T>, options: ActionOptions<T> = {}): Promise<boolean> => {
      // Двойной клик не должен отправить действие дважды.
      if (running.current) return false;
      running.current = true;
      setBusy(true);
      try {
        const result = await task();
        assertAccepted(result);
        const message =
          typeof options.success === 'function' ? options.success(result) : options.success;
        if (message) notify.success(message);
        const warning = options.warning?.(result);
        if (warning) notify.warning(warning);
        await options.after?.();
        return true;
      } catch (error) {
        const detail =
          error instanceof ActionRefused ? error.message : getApiErrorMessage(error, '');
        notify.error(
          adminErrorText(detail, t, (kopeks) => money(kopeks / 100)),
          t('common.error'),
        );
        return false;
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [money, notify, t],
  );

  return { busy, run };
}

export type RunAction = ReturnType<typeof useAdminAction>['run'];
