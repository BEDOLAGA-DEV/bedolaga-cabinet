import apiClient from './client';
import type { TaskRewardType, TaskType } from './adminTasks';

export interface UserTaskProgress {
  task_id: number;
  title: Record<string, string>;
  description: Record<string, string>;
  icon: string | null;
  task_type: TaskType;
  target_value: number;
  target_meta: Record<string, unknown>;
  reward_type: TaskRewardType;
  reward_value: number;
  reward_meta: Record<string, unknown>;
  allow_user_choice: boolean;
  level: number;
  parent_task_id: number | null;
  current_value: number;
  percent: number;
  is_completed: boolean;
  is_claimed: boolean;
  completed_at: string | null;
  claimed_at: string | null;
  reward_granted_meta: Record<string, unknown> | null;
}

export interface UserTasksListResponse {
  items: UserTaskProgress[];
  has_unclaimed: boolean;
  unclaimed_count: number;
}

export interface UserTasksAvailabilityResponse {
  has_available_tasks: boolean;
  unclaimed_count: number;
}

export interface ClaimRewardRequest {
  chosen_subscription_id?: number | null;
  chosen_reward_type?: TaskRewardType | null;
}

export interface ClaimRewardResponse {
  success: boolean;
  reward: Record<string, unknown>;
}

const BASE = '/cabinet/tasks';

export const userTasksApi = {
  availability: async (): Promise<UserTasksAvailabilityResponse> =>
    apiClient.get<UserTasksAvailabilityResponse>(`${BASE}/availability`).then((r) => r.data),

  list: async (): Promise<UserTasksListResponse> =>
    apiClient.get<UserTasksListResponse>(BASE).then((r) => r.data),

  claim: async (taskId: number, body: ClaimRewardRequest = {}): Promise<ClaimRewardResponse> =>
    apiClient.post<ClaimRewardResponse>(`${BASE}/${taskId}/claim`, body).then((r) => r.data),
};
