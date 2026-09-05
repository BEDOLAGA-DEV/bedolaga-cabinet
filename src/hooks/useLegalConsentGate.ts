import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LegalConsentConfig } from '../types';
import { getApiErrorMessage } from '../utils/api-error';

// Гейт согласия с офертой/политикой для НОВОГО пользователя. Бэк отвечает 428
// на создание аккаунта без галочек «ознакомлен» и просит повторить ТОТ ЖЕ запрос
// с accepted_legal_documents. Вход через Telegram происходит сам собой, поэтому
// чекбоксы показываются только по 428, а замыкание помнит, какой вход повторить.
//
// Один хук на все точки входа: экран логина (initData + email), кнопка виджета/
// OIDC на вебе, /auth/telegram/callback и /tg. Раньше гейт был только на экране
// логина, а остальные клали объект detail в текст ошибки и роняли дерево (#31).

export type ConsentRetry = (accepted: string[]) => Promise<void>;

interface ConsentRequirement {
  documents?: string[];
  prechecked?: boolean;
}

/** 428 «нужно согласие»: detail — объект {code, message, documents, missing, prechecked}. */
export function readConsentRequirement(err: unknown): ConsentRequirement | null {
  const error = err as { response?: { status?: number; data?: { detail?: unknown } } } | null;
  if (error?.response?.status !== 428) return null;
  const detail = error.response.data?.detail;
  return detail && typeof detail === 'object' ? (detail as ConsentRequirement) : {};
}

/** Новая копия accepted, где ещё не тронутые документы получают value. */
function withDefaults(
  accepted: Record<string, boolean>,
  documents: string[],
  value: boolean,
): Record<string, boolean> {
  const missing = documents.filter((document) => accepted[document] === undefined);
  if (missing.length === 0) return accepted;
  return { ...accepted, ...Object.fromEntries(missing.map((document) => [document, value])) };
}

export interface LegalConsentGateState {
  documents: string[];
  accepted: Record<string, boolean>;
  acceptedKeys: string[];
  allAccepted: boolean;
  toggle: (document: string, value: boolean) => void;
  /** Гейт ждёт галочек, чтобы повторить отложенный вход. */
  pending: boolean;
  isSubmitting: boolean;
  error: string;
  /** true — это 428, повтор взят гейтом; false — обычная ошибка, разбирает вызывающий. */
  capture: (err: unknown, retry: ConsentRetry) => boolean;
  /** Повторить отложенный вход с отмеченными документами. */
  confirm: (fallbackError: string) => Promise<void>;
}

/**
 * @param config публичный конфиг гейта (GET /cabinet/info/legal-consent) — нужен
 * только там, где чекбоксы рисуются ДО запроса (форма регистрации по email).
 * Список документов из 428 имеет приоритет: это то, что бэк требует прямо сейчас.
 */
export function useLegalConsentGate(config?: LegalConsentConfig): LegalConsentGateState {
  const configDocuments = useMemo(() => config?.documents ?? [], [config]);
  const [requiredDocuments, setRequiredDocuments] = useState<string[] | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [pendingRetry, setPendingRetry] = useState<ConsentRetry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const documents = requiredDocuments ?? configDocuments;

  useEffect(() => {
    if (!config?.prechecked || configDocuments.length === 0) return;
    setAccepted((prev) => withDefaults(prev, configDocuments, true));
  }, [config?.prechecked, configDocuments]);

  const acceptedKeys = useMemo(
    () => documents.filter((document) => accepted[document]),
    [documents, accepted],
  );
  const allAccepted = documents.length === 0 || acceptedKeys.length === documents.length;

  const toggle = useCallback((document: string, value: boolean) => {
    setAccepted((prev) => ({ ...prev, [document]: value }));
  }, []);

  const capture = useCallback((err: unknown, retry: ConsentRetry): boolean => {
    const requirement = readConsentRequirement(err);
    if (!requirement) return false;
    const required = requirement.documents ?? [];
    if (required.length > 0) {
      setRequiredDocuments(required);
      setAccepted((prev) => withDefaults(prev, required, Boolean(requirement.prechecked)));
    }
    setError('');
    setPendingRetry(() => retry);
    return true;
  }, []);

  const confirm = useCallback(
    async (fallbackError: string) => {
      if (!pendingRetry) return;
      setError('');
      setIsSubmitting(true);
      try {
        await pendingRetry(acceptedKeys);
        setPendingRetry(null);
      } catch (err) {
        setError(getApiErrorMessage(err, fallbackError));
      } finally {
        setIsSubmitting(false);
      }
    },
    [pendingRetry, acceptedKeys],
  );

  return {
    documents,
    accepted,
    acceptedKeys,
    allAccepted,
    toggle,
    pending: pendingRetry !== null,
    isSubmitting,
    error,
    capture,
    confirm,
  };
}
