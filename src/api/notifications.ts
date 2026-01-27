import apiClient from './client';

export interface NotificationSettings {
  subscription_expiry_enabled: boolean;
  subscription_expiry_days: number;
  traffic_warning_enabled: boolean;
  traffic_warning_percent: number;
  balance_low_enabled: boolean;
  balance_low_threshold: number;
  news_enabled: boolean;
  promo_offers_enabled: boolean;
}

export interface NotificationSettingsUpdate {
  subscription_expiry_enabled?: boolean;
  subscription_expiry_days?: number;
  traffic_warning_enabled?: boolean;
  traffic_warning_percent?: number;
  balance_low_enabled?: boolean;
  balance_low_threshold?: number;
  news_enabled?: boolean;
  promo_offers_enabled?: boolean;
}

export const notificationsApi = {
  // Get notification settings
  getSettings: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get<NotificationSettings>('/cabinet/notifications');
    return response.data;
  },

  // Update notification settings
  updateSettings: async (settings: NotificationSettingsUpdate): Promise<NotificationSettings> => {
    const response = await apiClient.patch<NotificationSettings>(
      '/cabinet/notifications',
      settings,
    );
    return response.data;
  },

  // Send test notification
  sendTestNotification: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/cabinet/notifications/test',
    );
    return response.data;
  },

  // Get notification history
  getHistory: async (
    limit = 20,
    offset = 0,
  ): Promise<{
    notifications: unknown[];
    total: number;
    limit: number;
    offset: number;
  }> => {
    const response = await apiClient.get('/cabinet/notifications/history', {
      params: { limit, offset },
    });
    return response.data;
  },
};
