import apiClient from './client';

export interface ReminderCardButton {
  kind: 'cabinet' | 'url';
  target: string;
  text: string;
}

export interface ReminderCard {
  id: number;
  title: string;
  body: string;
  button: ReminderCardButton | null;
}

export const remindersApi = {
  getActive: async (lang: string): Promise<ReminderCard[]> => {
    const response = await apiClient.get<ReminderCard[]>('/cabinet/reminders/active', {
      params: { lang },
    });
    return response.data;
  },
  dismiss: async (id: number): Promise<void> => {
    await apiClient.post(`/cabinet/reminders/${id}/dismiss`);
  },
};
