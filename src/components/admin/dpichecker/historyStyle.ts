/** Общее у истории кабинета и истории всего аккаунта: колонки строки, цвет итога, дата. */

/** Колонки на широком экране — как таблица истории dpichecker.st; на телефоне строка — карточка. */
export const HISTORY_GRID =
  'sm:grid sm:grid-cols-[3.5rem_minmax(0,1fr)_7.5rem_4rem_6.5rem_minmax(0,8rem)_7.5rem_8rem] sm:items-center sm:gap-3';

export const STATUS_TONE: Record<string, { dot: string; text: string }> = {
  completed: { dot: 'bg-success-400', text: 'text-success-400' },
  done: { dot: 'bg-success-400', text: 'text-success-400' },
  delivered: { dot: 'bg-success-400', text: 'text-success-400' },
  failed: { dot: 'bg-error-400', text: 'text-error-400' },
  rejected: { dot: 'bg-error-400', text: 'text-error-400' },
  unknown: { dot: 'bg-warning-400', text: 'text-warning-400' },
  cancelled: { dot: 'bg-dark-500', text: 'text-dark-400' },
  deleted: { dot: 'bg-dark-500', text: 'text-dark-400' },
};
export const RUNNING_TONE = { dot: 'bg-accent-400', text: 'text-accent-400' };

export const toneOf = (status: string) => STATUS_TONE[status] ?? RUNNING_TONE;

export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '';
