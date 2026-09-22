import apiClient from './client';

export type ReminderChannels = 'bot' | 'cabinet' | 'both';
export type ReminderButtonKind = 'none' | 'cabinet' | 'url';
export type AuthCondition = 'telegram_only' | 'email_only' | 'single_method';
export type SubscriptionSegment =
  | 'active'
  | 'trial'
  | 'expiring'
  | 'expired'
  | 'none'
  | 'low_balance'
  | 'tariff';

export interface ReminderConditions {
  auth?: AuthCondition | null;
  subscription?: {
    segment: SubscriptionSegment;
    days?: number | null;
    tariff_id?: number | null;
  } | null;
  registered_days_min?: number | null;
  inactive_days_min?: number | null;
}

export interface ReminderText {
  title: string;
  body: string;
  button?: string | null;
}

export interface ReminderPayload {
  name: string;
  channels: ReminderChannels;
  category: 'service' | 'marketing';
  conditions: ReminderConditions;
  repeat_every_days: number;
  max_sends: number;
  texts: Record<string, ReminderText>;
  button_kind: ReminderButtonKind;
  button_target: string | null;
}

export interface ReminderResponse extends ReminderPayload {
  id: number;
  is_active: boolean;
  is_builtin: boolean;
  created_at: string | null;
  updated_at: string | null;
  stats: {
    sent_total: number;
    dismissed_total: number;
    audience_bot: number | null;
    audience_cabinet: number | null;
  };
}

export interface AudienceResponse {
  bot: number | null;
  cabinet: number | null;
}

const base = '/cabinet/admin/reminders';

export const adminRemindersApi = {
  list: async () => (await apiClient.get<ReminderResponse[]>(base)).data,
  get: async (id: number) => (await apiClient.get<ReminderResponse>(`${base}/${id}`)).data,
  create: async (payload: ReminderPayload) =>
    (await apiClient.post<ReminderResponse>(base, payload)).data,
  update: async (id: number, payload: ReminderPayload) =>
    (await apiClient.put<ReminderResponse>(`${base}/${id}`, payload)).data,
  toggle: async (id: number) =>
    (await apiClient.post<ReminderResponse>(`${base}/${id}/toggle`)).data,
  remove: async (id: number) => {
    await apiClient.delete(`${base}/${id}`);
  },
  audience: async (req: { conditions: ReminderConditions; channels: ReminderChannels }) =>
    (await apiClient.post<AudienceResponse>(`${base}/audience`, req)).data,
  test: async (id: number) => (await apiClient.post<{ ok: boolean }>(`${base}/${id}/test`)).data,
};
