import type { Job } from '@/api/reachability';

/**
 * Последний ответ API bschek, который бот записал в задачу, пока проба «забирает результат»
 * повтором с тем же ключом (result.retrieve). Без записи — null.
 */
export interface RetrieveTrace {
  /** «409 request_in_progress» или просто код, если HTTP-статуса нет. */
  answer: string;
  attempt: number;
  at: string | null;
  requestId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function retrieveTrace(job: Pick<Job, 'result'>): RetrieveTrace | null {
  const raw = job.result?.retrieve;
  if (!isRecord(raw) || typeof raw.code !== 'string') return null;
  const status = typeof raw.status === 'number' ? raw.status : null;
  return {
    answer: status === null ? raw.code : `${status} ${raw.code}`,
    attempt: typeof raw.attempt === 'number' ? raw.attempt : 0,
    at: typeof raw.at === 'string' ? raw.at : null,
    requestId: typeof raw.request_id === 'string' ? raw.request_id : null,
  };
}
