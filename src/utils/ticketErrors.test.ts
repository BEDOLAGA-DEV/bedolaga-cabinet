import { readFileSync } from 'node:fs';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { isOpenTicketConflict } from './ticketErrors';

function axiosErrorWithStatus(status: number, detail?: unknown): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers };
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: '',
      headers,
      config,
      data: detail === undefined ? {} : { detail },
    },
  );
}

describe('isOpenTicketConflict', () => {
  it('ловит 409 от POST /cabinet/tickets', () => {
    expect(isOpenTicketConflict(axiosErrorWithStatus(409, 'You already have an open ticket'))).toBe(
      true,
    );
  });

  it('не зависит от текста detail (он приходит с бэка по-английски)', () => {
    expect(isOpenTicketConflict(axiosErrorWithStatus(409))).toBe(true);
    expect(isOpenTicketConflict(axiosErrorWithStatus(409, { code: 'open_ticket_exists' }))).toBe(
      true,
    );
  });

  it('не путает с другими отказами бэка', () => {
    expect(isOpenTicketConflict(axiosErrorWithStatus(403, 'Support tickets are disabled'))).toBe(
      false,
    );
    expect(isOpenTicketConflict(axiosErrorWithStatus(400))).toBe(false);
    expect(isOpenTicketConflict(axiosErrorWithStatus(500))).toBe(false);
  });

  it('не падает на не-axios ошибках', () => {
    expect(isOpenTicketConflict(new Error('boom'))).toBe(false);
    expect(isOpenTicketConflict(undefined)).toBe(false);
    expect(isOpenTicketConflict(null)).toBe(false);
  });
});

describe('обработчики ошибок на форме поддержки', () => {
  // Решение «это 409» вынесено в утилиту и покрыто выше, а вот сама привязка
  // onError к мутациям — нет: в репозитории нет окружения для рендера
  // компонентов (vitest настроен на node, без jsdom). Поэтому закрепляем
  // структурно: пропажа onError — это ровно тот баг, который PR и чинит
  // (форма молчала, человек жал «Отправить» повторно).
  const source = readFileSync(new URL('../pages/Support.tsx', import.meta.url), 'utf8');

  it('createMutation обрабатывает отказ бэка', () => {
    const block = source.slice(
      source.indexOf('const createMutation'),
      source.indexOf('const replyMutation'),
    );
    expect(block).toContain('onError');
    expect(block).toContain('isOpenTicketConflict');
  });

  it('replyMutation обрабатывает отказ бэка', () => {
    const block = source.slice(
      source.indexOf('const replyMutation'),
      source.indexOf('const getStatusBadge'),
    );
    expect(block).toContain('onError');
  });

  it('409 подтягивает список тикетов — открытый мог появиться в другой сессии', () => {
    const block = source.slice(
      source.indexOf('isOpenTicketConflict(error)'),
      source.indexOf('const replyMutation'),
    );
    expect(block).toContain('invalidateQueries');
  });
});
