// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { usePermissionStore } from '@/store/permissions';

const { api } = vi.hoisted(() => ({
  api: {
    list: vi.fn(),
    toggle: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}));
vi.mock('@/api/adminReminders', () => ({ adminRemindersApi: api }));

import AdminReminders from './AdminReminders';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <PlatformProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AdminReminders />
        </MemoryRouter>
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

describe('AdminReminders — права доступа', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('с правом только на чтение не показывает «Создать» и удаление', async () => {
    usePermissionStore.setState({
      permissions: ['user_reminders:read'],
      roleLevel: 0,
      isLoaded: true,
    });
    api.list.mockResolvedValue([
      {
        id: 1,
        name: 'Тест',
        channels: 'both',
        category: 'service',
        conditions: {},
        repeat_every_days: 7,
        max_sends: 1,
        texts: {},
        button_kind: 'none',
        button_target: null,
        is_active: true,
        is_builtin: false,
        created_at: null,
        updated_at: null,
        stats: { sent_total: 0, dismissed_total: 0, audience_bot: null, audience_cabinet: null },
      },
    ]);
    renderPage();

    await waitFor(() => expect(api.list).toHaveBeenCalled());
    await screen.findByText('Тест');

    expect(screen.queryByText('admin.reminders.create')).toBeNull();
    expect(screen.queryByLabelText('admin.reminders.delete')).toBeNull();
    expect(screen.queryByText('admin.reminders.enable')).toBeNull();
    expect(screen.queryByLabelText('admin.reminders.edit')).toBeNull();
  });
});
