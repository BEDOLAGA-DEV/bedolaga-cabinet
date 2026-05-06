import apiClient from './client';

export type TaskType =
  | 'purchase_tariff'
  | 'subscribe_channel'
  | 'traffic_used'
  | 'referrals_invited'
  | 'purchase_period'
  | 'spend_amount'
  | 'multi_tariff'
  | 'gift_purchased'
  | 'gifts_count';

export type TaskRewardType = 'balance' | 'subscription_days';
export type TaskUserAudience = 'telegram' | 'email' | 'both';

export interface Task {
  id: number;
  title: Record<string, string>;
  description: Record<string, string>;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  task_type: TaskType;
  target_value: number;
  target_meta: Record<string, unknown>;
  reward_type: TaskRewardType;
  reward_value: number;
  reward_meta: Record<string, unknown>;
  allow_user_choice: boolean;
  user_audience: TaskUserAudience;
  promo_group_id: number | null;
  parent_task_id: number | null;
  level: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TaskListItem {
  id: number;
  title: Record<string, string>;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  task_type: TaskType;
  target_value: number;
  reward_type: TaskRewardType;
  reward_value: number;
  user_audience: TaskUserAudience;
  promo_group_id: number | null;
  parent_task_id: number | null;
  level: number;
  updated_at: string | null;
}

export interface TaskCreateRequest {
  title: Record<string, string>;
  description?: Record<string, string>;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
  task_type: TaskType;
  target_value: number;
  target_meta?: Record<string, unknown>;
  reward_type: TaskRewardType;
  reward_value: number;
  reward_meta?: Record<string, unknown>;
  allow_user_choice?: boolean;
  user_audience?: TaskUserAudience;
  promo_group_id?: number | null;
  parent_task_id?: number | null;
  level?: number;
  starts_at?: string | null;
  ends_at?: string | null;
}

export type TaskUpdateRequest = Partial<TaskCreateRequest>;

export interface TaskPartnerChannel {
  id: number;
  channel_id: string;
  title: string;
  channel_link: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

export interface TaskPartnerChannelCreateRequest {
  channel_id: string;
  title: string;
  channel_link?: string | null;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export type TaskPartnerChannelUpdateRequest = Partial<
  Omit<TaskPartnerChannelCreateRequest, 'channel_id'>
>;

const BASE = '/cabinet/admin';

export const adminTasksApi = {
  list: async (includeInactive = true): Promise<TaskListItem[]> =>
    apiClient
      .get<TaskListItem[]>(`${BASE}/tasks`, { params: { include_inactive: includeInactive } })
      .then((r) => r.data),

  get: async (taskId: number): Promise<Task> =>
    apiClient.get<Task>(`${BASE}/tasks/${taskId}`).then((r) => r.data),

  create: async (data: TaskCreateRequest): Promise<Task> =>
    apiClient.post<Task>(`${BASE}/tasks`, data).then((r) => r.data),

  update: async (taskId: number, data: TaskUpdateRequest): Promise<Task> =>
    apiClient.put<Task>(`${BASE}/tasks/${taskId}`, data).then((r) => r.data),

  remove: async (taskId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/tasks/${taskId}`);
  },
};

export const adminTaskPartnerChannelsApi = {
  list: async (includeInactive = true): Promise<TaskPartnerChannel[]> =>
    apiClient
      .get<TaskPartnerChannel[]>(`${BASE}/task-partner-channels`, {
        params: { include_inactive: includeInactive },
      })
      .then((r) => r.data),

  create: async (data: TaskPartnerChannelCreateRequest): Promise<TaskPartnerChannel> =>
    apiClient.post<TaskPartnerChannel>(`${BASE}/task-partner-channels`, data).then((r) => r.data),

  update: async (
    channelPk: number,
    data: TaskPartnerChannelUpdateRequest,
  ): Promise<TaskPartnerChannel> =>
    apiClient
      .put<TaskPartnerChannel>(`${BASE}/task-partner-channels/${channelPk}`, data)
      .then((r) => r.data),

  remove: async (channelPk: number): Promise<void> => {
    await apiClient.delete(`${BASE}/task-partner-channels/${channelPk}`);
  },
};
