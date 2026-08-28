import apiClient from './client';

// ============ Types ============

/** Статусы доставки уведомления об ошибке в админ-чат. */
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'suppressed' | 'skipped';

/** Статусы, означающие «админ об этом так и не узнал». */
export const UNDELIVERED_STATUSES: DeliveryStatus[] = ['pending', 'failed'];

export interface SystemErrorListItem {
  id: number;
  created_at: string | null;
  level: string;
  logger_name: string | null;
  event: string;
  error_type: string | null;
  user_id: number | null;
  delivery_status: DeliveryStatus;
  delivery_attempts: number;
  delivered_at: string | null;
  has_traceback: boolean;
}

export interface SystemErrorDetail extends SystemErrorListItem {
  traceback: string | null;
  context: Record<string, string> | null;
  last_attempt_at: string | null;
  delivery_error: string | null;
  dedup_hash: string | null;
}

export interface SystemErrorListResponse {
  items: SystemErrorListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TopError {
  error_type: string | null;
  event: string;
  count: number;
}

export interface SystemErrorSummary {
  undelivered_total: number;
  last_24h: number;
  last_7d: number;
  by_status_7d: Record<string, number>;
  top_errors_7d: TopError[];
}

export interface SystemErrorListParams {
  level?: string;
  delivery_status?: string;
  logger_name?: string;
  search?: string;
  undelivered_only?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// ============ API ============

export const adminSystemErrorsApi = {
  async getSummary(): Promise<SystemErrorSummary> {
    const { data } = await apiClient.get<SystemErrorSummary>('/admin/system-errors/summary');
    return data;
  },

  async getAll(params: SystemErrorListParams = {}): Promise<SystemErrorListResponse> {
    const { data } = await apiClient.get<SystemErrorListResponse>('/admin/system-errors', {
      params,
    });
    return data;
  },

  async getOne(id: number): Promise<SystemErrorDetail> {
    const { data } = await apiClient.get<SystemErrorDetail>(`/admin/system-errors/${id}`);
    return data;
  },

  /** Повторно отправить ошибку в админ-чат, минуя троттлинг и дедупликацию. */
  async retry(id: number): Promise<SystemErrorDetail> {
    const { data } = await apiClient.post<SystemErrorDetail>(`/admin/system-errors/${id}/retry`);
    return data;
  },
};

export default adminSystemErrorsApi;
