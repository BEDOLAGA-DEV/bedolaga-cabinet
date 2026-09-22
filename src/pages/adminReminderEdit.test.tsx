// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
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
}

describe('AdminReminderEdit', () => {
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
});
