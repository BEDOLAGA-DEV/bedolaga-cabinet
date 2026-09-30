// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { adminBroadcastsApi } from '../../api/adminBroadcasts';
import { BroadcastAudienceEditor } from './BroadcastAudienceEditor';

const granted = new Set<string>();

vi.mock('../../store/permissions', () => ({
  usePermissionStore: (selector: (state: unknown) => unknown) =>
    selector({ hasPermission: (perm: string) => granted.has(perm) }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('../../api/adminBroadcasts', () => ({
  adminBroadcastsApi: {
    previewAudience: vi.fn(async () => ({
      count: 1,
      offset: 0,
      limit: 50,
      users: [{ id: 1, username: 'recipient', telegram_id: 1001 }],
    })),
    searchAudienceUsers: vi.fn(async () => ({ count: 0, offset: 0, limit: 20, users: [] })),
  },
}));

beforeEach(() => {
  granted.clear();
  granted.add('users:read');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderEditor = (audience: Parameters<typeof BroadcastAudienceEditor>[0]['audience']) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <BroadcastAudienceEditor
          channel="telegram"
          category="system"
          audience={audience}
          onChange={() => {}}
          filters={[{ key: 'all', label: 'Все', group: 'basic', count: 1 }]}
          isLoading={false}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

it('keeps focus in the recipient dialog and restores it after Escape', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BroadcastAudienceEditor
          channel="telegram"
          category="system"
          audience={{ conditions: [{ field: 'basic', value: 'all', operator: 'eq', join: null }] }}
          onChange={() => {}}
          filters={[{ key: 'all', label: 'Все', group: 'basic', count: 1 }]}
          isLoading={false}
        />
        <button type="button">Send broadcast</button>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  const trigger = await screen.findByRole('button', { name: 'Посмотреть список' });
  trigger.focus();
  fireEvent.click(trigger);

  const dialog = await screen.findByRole('dialog');
  const recipient = await screen.findByRole('link', { name: /recipient/ });
  expect(recipient.getAttribute('href')).toBe('/admin/users/1');
  expect(recipient.getAttribute('target')).toBe('_blank');
  expect(dialog.contains(document.activeElement)).toBe(true);
  expect(fireEvent.keyDown(document, { key: 'Tab', cancelable: true })).toBe(false);
  expect(dialog.contains(document.activeElement)).toBe(true);

  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

it('shows only the audience size without users:read (the server returns no people)', async () => {
  granted.clear();
  renderEditor({ conditions: [{ field: 'basic', value: 'all', operator: 'eq', join: null }] });

  expect(await screen.findByText('1')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Посмотреть список' })).toBeNull();
});

it('does not search people without users:read', async () => {
  granted.clear();
  renderEditor({ conditions: [{ field: 'telegram_id', value: '', operator: 'eq', join: null }] });

  const input = screen.getByRole('combobox', { name: 'Telegram ID' }) as HTMLInputElement;
  expect(input.disabled).toBe(true);
  expect(input.placeholder).toBe('Нужно право на просмотр пользователей');
  expect(adminBroadcastsApi.searchAudienceUsers).not.toHaveBeenCalled();
});
