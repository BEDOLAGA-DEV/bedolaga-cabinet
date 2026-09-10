import apiClient from './client';

/**
 * След пользователя: кабинет сообщает серверу об открытии каждого экрана —
 * раздел «Активность» у админа показывает и просмотры, а не только покупки.
 * Fire-and-forget: ответ не нужен, сбой не должен мешать экрану.
 */
export const activityApi = {
  reportScreen: (path: string): Promise<void> =>
    apiClient.post('/cabinet/activity/screen', { path }).then(
      () => undefined,
      () => undefined,
    ),
};
