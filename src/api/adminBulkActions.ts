import apiClient from './client';
import { tokenStorage } from '../utils/token';

export type BulkActionType =
  | 'extend_subscription'
  | 'add_days'
  | 'cancel_subscription'
  | 'activate_subscription'
  | 'change_tariff'
  | 'add_traffic'
  | 'add_balance'
  | 'assign_promo_group'
  | 'grant_subscription'
  | 'set_devices'
  | 'delete_subscription'
  | 'delete_user';

export interface BulkActionRequest {
  action: BulkActionType;
  user_ids?: number[];
  subscription_ids?: number[];
  params: BulkActionParams;
  dry_run?: boolean;
}

export interface BulkActionParams {
  days?: number;
  tariff_id?: number;
  traffic_gb?: number;
  amount_kopeks?: number;
  balance_description?: string;
  promo_group_id?: number | null;
  device_limit?: number;
  delete_from_panel?: boolean;
  force_delete_active_paid?: boolean;
}

export interface BulkActionErrorItem {
  user_id: number;
  username?: string;
  error: string;
}

export interface BulkActionResult {
  success: boolean;
  total: number;
  success_count: number;
  error_count: number;
  skipped_count: number;
  errors: BulkActionErrorItem[];
}

export interface BulkProgressEvent {
  type: 'progress';
  current: number;
  total: number;
  user_id: number;
  subscription_id?: number;
  username?: string;
  success: boolean;
  message?: string;
  error?: string;
}

export interface BulkCompleteEvent {
  type: 'complete';
  total: number;
  success_count: number;
  error_count: number;
  skipped_count: number;
}

export type BulkSSEEvent = BulkProgressEvent | BulkCompleteEvent;

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const adminBulkActionsApi = {
  execute: async (data: BulkActionRequest): Promise<BulkActionResult> => {
    const response = await apiClient.post('/cabinet/admin/bulk/execute', data);
    const raw = response.data;
    // Transform backend results[] to frontend errors[]
    const errors: BulkActionErrorItem[] = (raw.results || [])
      .filter((r: { success: boolean }) => !r.success)
      .map((r: { user_id: number; username?: string; message?: string }) => ({
        user_id: r.user_id,
        username: r.username,
        error: r.message || 'Unknown error',
      }));
    return {
      success: raw.error_count === 0,
      total: raw.total,
      success_count: raw.success_count,
      error_count: raw.error_count,
      skipped_count: raw.skipped_count || 0,
      errors,
    };
  },

  executeWithStream: async (
    data: BulkActionRequest,
    onEvent: (event: BulkSSEEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const token = tokenStorage.getAccessToken();
    const response = await fetch(`${API_BASE_URL}/cabinet/admin/bulk/execute?stream=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.slice(6)) as BulkSSEEvent;
              onEvent(event);
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }

      // process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.trim().slice(6)) as BulkSSEEvent;
          onEvent(event);
        } catch {
          // skip
        }
      }
    } else {
      // Fallback: non-streaming JSON response
      const raw = await response.json();
      onEvent({
        type: 'complete',
        total: raw.total,
        success_count: raw.success_count,
        error_count: raw.error_count,
        skipped_count: raw.skipped_count || 0,
      });
    }
  },
};
