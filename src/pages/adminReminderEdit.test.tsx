// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePermissionStore } from '@/store/permissions';
import type { ReminderResponse } from '@/api/adminReminders';

const { api } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    audience: vi.fn(),
    test: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}));
vi.mock('@/api/adminReminders', () => ({ adminRemindersApi: api }));

import AdminReminderEdit from './AdminReminderEdit';

function renderAt(
  path: string,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/reminders/create" element={<AdminReminderEdit />} />
          <Route path="/admin/reminders/:id/edit" element={<AdminReminderEdit />} />
          <Route path="/admin/reminders" element={<div>list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, client };
}

const baseReminder: ReminderResponse = {
  id: 5,
  name: 'Существующее',
  channels: 'both',
  category: 'service',
  conditions: {},
  repeat_every_days: 7,
  max_sends: 1,
  texts: { ru: { title: 'Заголовок', body: 'Текст', button: null } },
  button_kind: 'none',
  button_target: null,
  is_active: true,
  is_builtin: false,
  created_at: null,
  updated_at: null,
  stats: { sent_total: 0, dismissed_total: 0, audience_bot: null, audience_cabinet: null },
};

describe('AdminReminderEdit', () => {
  beforeEach(() => {
    usePermissionStore.setState({ permissions: ['*:*'], roleLevel: 100, isLoaded: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('builds the payload from the form', async () => {
    api.audience.mockResolvedValue({ bot: 3, cabinet: 5 });
    api.create.mockResolvedValue({ id: 1 });
    renderAt('/admin/reminders/create');

    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'Способ входа' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.auth'), {
      target: { value: 'single_method' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.registeredDays'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Заголовок' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.body'), {
      target: { value: 'Текст' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonKind'), {
      target: { value: 'cabinet' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonTarget'), {
      target: { value: '/profile/accounts' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonText'), {
      target: { value: 'Привязать' },
    });

    await waitFor(() => expect(api.audience).toHaveBeenCalled());
    expect(await screen.findByText(/3/)).toBeTruthy();
    // Аудитория считается по категории напоминания — форма шлёт её в запросе,
    // после дебаунса, дождавшись финального (заполненного) набора условий.
    await waitFor(() =>
      expect(api.audience).toHaveBeenCalledWith({
        conditions: { auth: 'single_method', registered_days_min: 3 },
        channels: 'both',
        category: 'service',
      }),
    );

    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    expect(api.create.mock.calls[0][0]).toEqual({
      name: 'Способ входа',
      channels: 'both',
      category: 'service',
      conditions: { auth: 'single_method', registered_days_min: 3 },
      repeat_every_days: 7,
      max_sends: 1,
      texts: { ru: { title: 'Заголовок', body: 'Текст', button: 'Привязать' } },
      button_kind: 'cabinet',
      button_target: '/profile/accounts',
    });
  });

  it('does not save without a Russian title and body', async () => {
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    renderAt('/admin/reminders/create');
    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'X' },
    });
    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    expect(await screen.findByText('admin.reminders.form.ruRequired')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('strips per-language button texts when the button kind is switched back to none', async () => {
    api.audience.mockResolvedValue({ bot: 1, cabinet: 1 });
    api.create.mockResolvedValue({ id: 2 });
    renderAt('/admin/reminders/create');

    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'Кнопка' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Заголовок' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.body'), {
      target: { value: 'Текст' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonKind'), {
      target: { value: 'cabinet' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonTarget'), {
      target: { value: '/profile/accounts' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonText'), {
      target: { value: 'Привязать' },
    });
    // Передумали — кнопки не будет, но текст кнопки остаётся в форме на случай,
    // если админ опять включит кнопку.
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonKind'), {
      target: { value: 'none' },
    });

    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    const sent = api.create.mock.calls[0][0];
    expect(sent.texts.ru).toEqual({ title: 'Заголовок', body: 'Текст' });
    expect(sent.texts.ru.button).toBeUndefined();
    expect(sent.button_target).toBeNull();
  });

  it('does not query the audience or save while a tariff segment has no id', async () => {
    api.audience.mockResolvedValue({ bot: 1, cabinet: 1 });
    renderAt('/admin/reminders/create');

    // Начальный запрос счётчика уходит ещё до выбора сегмента (условия пустые) —
    // фиксируем это число вызовов, чтобы отличить его от повторных из-за тарифа.
    await waitFor(() => expect(api.audience).toHaveBeenCalled());
    const callsBeforeTariff = api.audience.mock.calls.length;

    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'Тариф' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.segment'), {
      target: { value: 'tariff' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Заголовок' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.body'), {
      target: { value: 'Текст' },
    });

    // Дольше дебаунса (400мс) — новых вызовов счётчика быть не должно.
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(api.audience).toHaveBeenCalledTimes(callsBeforeTariff);

    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    expect(await screen.findByText('admin.reminders.form.tariffRequired')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('maps a 400 test-send failure to the no-Telegram message', async () => {
    api.get.mockResolvedValue(baseReminder);
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    api.test.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400 } });
    renderAt('/admin/reminders/5/edit');

    await screen.findByDisplayValue('Заголовок');
    fireEvent.click(screen.getByText('admin.reminders.form.sendTest'));
    expect(await screen.findByText('admin.reminders.form.testNoTelegram')).toBeTruthy();
  });

  it('maps a 422 test-send failure to the invalid-texts message', async () => {
    api.get.mockResolvedValue(baseReminder);
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    api.test.mockRejectedValueOnce({ isAxiosError: true, response: { status: 422 } });
    renderAt('/admin/reminders/5/edit');

    await screen.findByDisplayValue('Заголовок');
    fireEvent.click(screen.getByText('admin.reminders.form.sendTest'));
    expect(await screen.findByText('admin.reminders.form.testInvalidTexts')).toBeTruthy();
  });

  it('falls back to the generic failure message for other test-send errors', async () => {
    api.get.mockResolvedValue(baseReminder);
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    api.test.mockRejectedValueOnce({ isAxiosError: true, response: { status: 502 } });
    renderAt('/admin/reminders/5/edit');

    await screen.findByDisplayValue('Заголовок');
    fireEvent.click(screen.getByText('admin.reminders.form.sendTest'));
    expect(await screen.findByText('admin.reminders.form.testFailed')).toBeTruthy();
  });

  it('does not crash and shows empty fields for a language missing from stored texts', async () => {
    api.get.mockResolvedValue(baseReminder);
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    renderAt('/admin/reminders/5/edit');

    await screen.findByDisplayValue('Заголовок');
    fireEvent.click(screen.getByText('EN'));

    expect((screen.getByLabelText('admin.reminders.form.title') as HTMLInputElement).value).toBe(
      '',
    );
    expect((screen.getByLabelText('admin.reminders.form.body') as HTMLTextAreaElement).value).toBe(
      '',
    );
  });

  it('requires a Russian button text when a button is enabled', async () => {
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    renderAt('/admin/reminders/create');

    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'Кнопка' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Заголовок' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.body'), {
      target: { value: 'Текст' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonKind'), {
      target: { value: 'cabinet' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonTarget'), {
      target: { value: '/profile/accounts' },
    });
    // Текст кнопки на ru намеренно не заполнен.

    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    expect(await screen.findByText('admin.reminders.form.buttonTextRequired')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('requires both title and body for a non-ru language once one of them is filled', async () => {
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    renderAt('/admin/reminders/create');

    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'Частичный язык' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Заголовок' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.body'), {
      target: { value: 'Текст' },
    });
    fireEvent.click(screen.getByText('EN'));
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Only title' },
    });
    // Текст (body) для en намеренно не заполнен.

    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    expect(await screen.findByText('admin.reminders.form.partialLanguage')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('requires an https:// link for a url button', async () => {
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    renderAt('/admin/reminders/create');

    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'Ссылка' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Заголовок' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.body'), {
      target: { value: 'Текст' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonKind'), {
      target: { value: 'url' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonTarget'), {
      target: { value: 'http://insecure.example' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.buttonText'), {
      target: { value: 'Open' },
    });

    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    expect(await screen.findByText('admin.reminders.form.httpsRequired')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('shows the backend detail message on a 422 that slips past client validation', async () => {
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    api.create.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 422, data: { detail: [{ msg: 'texts.ru is required' }] } },
    });
    renderAt('/admin/reminders/create');

    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Заголовок' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.body'), {
      target: { value: 'Текст' },
    });

    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    expect(await screen.findByText('texts.ru is required')).toBeTruthy();
  });

  it('falls back to the generic save-failed message without a detail array', async () => {
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    api.create.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } });
    renderAt('/admin/reminders/create');

    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.title'), {
      target: { value: 'Заголовок' },
    });
    fireEvent.change(screen.getByLabelText('admin.reminders.form.body'), {
      target: { value: 'Текст' },
    });

    fireEvent.click(screen.getByText('admin.reminders.form.save'));
    expect(await screen.findByText('admin.reminders.form.saveFailed')).toBeTruthy();
  });

  it('shows a hint next to the send-to-myself button', async () => {
    api.get.mockResolvedValue(baseReminder);
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    renderAt('/admin/reminders/5/edit');

    await screen.findByDisplayValue('Заголовок');
    expect(screen.getByText('admin.reminders.form.testHint')).toBeTruthy();
  });

  it('does not lose what the admin is typing when the reminder refetches', async () => {
    api.get.mockResolvedValue(baseReminder);
    api.audience.mockResolvedValue({ bot: 0, cabinet: 0 });
    const { client } = renderAt('/admin/reminders/5/edit');

    await screen.findByDisplayValue('Заголовок');
    fireEvent.change(screen.getByLabelText('admin.reminders.form.name'), {
      target: { value: 'Печатаю новое имя' },
    });

    // Рефетч вернул тот же id, но другую статистику — форма не должна затереть ввод.
    client.setQueryData(['admin-reminder', 5], {
      ...baseReminder,
      stats: { ...baseReminder.stats, sent_total: 7 },
    });

    await waitFor(() =>
      expect((screen.getByLabelText('admin.reminders.form.name') as HTMLInputElement).value).toBe(
        'Печатаю новое имя',
      ),
    );
  });
});
