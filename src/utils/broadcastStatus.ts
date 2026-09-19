/** Статусы, при которых доставка ещё идёт и запись рассылки нужно перезапрашивать. */
export const BROADCAST_IN_FLIGHT_STATUSES = ['queued', 'in_progress', 'cancelling'] as const;

/** Доставка ещё не завершена: показываем прогресс и продолжаем поллинг. */
export function isBroadcastInFlight(status: string | undefined): boolean {
  if (!status) return false;
  return (BROADCAST_IN_FLIGHT_STATUSES as readonly string[]).includes(status);
}

/** Интервал поллинга для react-query: пока идёт доставка — 3 секунды, иначе не опрашиваем. */
export function broadcastPollInterval(status: string | undefined): number | false {
  return isBroadcastInFlight(status) ? 3000 : false;
}
