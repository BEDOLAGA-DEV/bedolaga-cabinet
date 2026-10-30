/**
 * Антифрод: что кабинет знает о злоупотреблениях.
 *
 * Данных два набора, и они не пересекаются намеренно. Клиенту — только
 * предупреждение, которое ему уже отправили. Оператору — вердикт и история
 * нарушений.
 *
 * Разница не в вежливости: перечень сработавших признаков на руках у
 * нарушителя превращается в инструкцию по обходу, человек просто разнесёт
 * подключения по разным сетям и устройствам.
 *
 * Сервис необязательный. Не настроен или недоступен — приходит `available:
 * false` и пустой статус, экраны работают как раньше.
 */
import apiClient from './client';

export interface AbuseNotice {
  subject: string | null;
  body: string | null;
  sent_at: string | null;
}

export interface AbuseStatus {
  warned: boolean;
  notice: AbuseNotice | null;
}

export interface AbuseViolation {
  detected_at: string | null;
  score: number | null;
  recommended_action: string | null;
  action_taken: string | null;
  reasons: string[] | null;
  notified_at: string | null;
}

export interface AbuseOverview {
  available: boolean;
  level: 'clean' | 'warned' | 'limited' | null;
  violations_count: number;
  max_score: number | null;
  last_detected_at: string | null;
  whitelisted: boolean;
  violations: AbuseViolation[];
}

export const abuseApi = {
  /** Предупреждение для самого клиента: текст, который он уже получил. */
  myStatus: async (): Promise<AbuseStatus> => {
    const response = await apiClient.get<AbuseStatus>('/cabinet/abuse-status');
    return response.data;
  },

  /** Вердикт и история нарушений клиента — для оператора. */
  userOverview: async (userId: number): Promise<AbuseOverview> => {
    const response = await apiClient.get<AbuseOverview>(`/cabinet/admin/users/${userId}/abuse`);
    return response.data;
  },
};
