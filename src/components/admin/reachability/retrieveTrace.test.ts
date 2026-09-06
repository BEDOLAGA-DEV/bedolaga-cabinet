import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/reachability';
import { retrieveTrace } from './retrieveTrace';

/** Пока проба «забирает результат», бот пишет в задачу последний ответ API — показываем его. */

const job = (result: Job['result']): Job => ({ result, attempts: 15 }) as unknown as Job;

describe('retrieveTrace', () => {
  it('разбирает запись бота: код, статус, попытка, время, request_id', () => {
    expect(
      retrieveTrace(
        job({
          retrieve: {
            code: 'request_in_progress',
            status: 409,
            message: 'wait',
            request_id: 'r9',
            attempt: 15,
            at: '2026-09-06T17:40:00+00:00',
          },
        }),
      ),
    ).toEqual({
      answer: '409 request_in_progress',
      attempt: 15,
      at: '2026-09-06T17:40:00+00:00',
      requestId: 'r9',
    });
  });

  it('без статуса — только код; без записи — null', () => {
    expect(retrieveTrace(job({ retrieve: { code: 'timeout', attempt: 2 } }))?.answer).toBe(
      'timeout',
    );
    expect(retrieveTrace(job(null))).toBeNull();
    expect(retrieveTrace(job({ response: {} }))).toBeNull();
    expect(retrieveTrace(job({ retrieve: 'garbage' }))).toBeNull();
  });
});
