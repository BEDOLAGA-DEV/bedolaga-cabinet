import axios from 'axios';

/**
 * true, если бэк отказал в создании тикета из-за уже открытого обращения.
 *
 * `POST /cabinet/tickets` отвечает 409 ровно в одном случае — у пользователя
 * есть незакрытый тикет (`detail: 'You already have an open ticket'`, паритет
 * с бот-путём). Сверяемся со статусом, а не с текстом: detail приходит с бэка
 * только по-английски, а кабинет и бот версионируются раздельно — текст может
 * поменяться в любой сборке бота, статус останется.
 */
export function isOpenTicketConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}
