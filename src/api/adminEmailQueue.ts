import { apiClient } from './client';

/** Письмо, ожидающее отправки или уже отработавшее. Тело письма сервер не отдаёт. */
export interface EmailQueueItem {
  id: number;
  to_email: string;
  subject: string;
  status: 'pending' | 'sent' | 'dead';
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface EmailQueueState {
  pending: number;
  sent: number;
  dead: number;
  /** false — почтовый сервер не настроен, письма не отправляются вовсе */
  smtp_configured: boolean;
  items: EmailQueueItem[];
}

export const adminEmailQueueApi = {
  getQueue: async (): Promise<EmailQueueState> => {
    const response = await apiClient.get<EmailQueueState>('/cabinet/admin/email-queue');
    return response.data;
  },

  clearQueue: async (pendingOnly = false): Promise<{ removed: number }> => {
    const response = await apiClient.delete<{ removed: number }>('/cabinet/admin/email-queue', {
      params: { pending_only: pendingOnly },
    });
    return response.data;
  },
};
