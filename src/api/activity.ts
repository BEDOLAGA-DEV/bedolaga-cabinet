import apiClient from './client';

/** Событие следа: открытие экрана или нажатие с подписью кнопки. */
export interface ActivityEvent {
  kind: 'screen' | 'click';
  /** Путь экрана без query и фрагмента — там бывают токены. */
  path: string;
  label?: string;
}

/**
 * След пользователя: кабинет сообщает серверу о каждом открытом экране и каждом
 * нажатии — раздел «Активность» у админа показывает всё, что делал человек.
 * Fire-and-forget: ответ не нужен, сбой не должен мешать экрану.
 */
export const activityApi = {
  sendEvents: (events: ActivityEvent[]): Promise<void> =>
    apiClient.post('/cabinet/activity/events', { events }).then(
      () => undefined,
      () => undefined,
    ),
};
