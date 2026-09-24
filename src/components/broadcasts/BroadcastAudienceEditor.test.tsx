// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { BroadcastAudienceEditor } from './BroadcastAudienceEditor';

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
  },
}));

afterEach(cleanup);

it('keeps focus in the recipient dialog and restores it after Escape', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <BroadcastAudienceEditor
        channel="telegram"
        category="system"
        audience={{ conditions: [{ field: 'basic', value: 'all', operator: 'eq', join: null }] }}
        onChange={() => {}}
        filters={[{ key: 'all', label: 'Все', group: 'basic', count: 1 }]}
        isLoading={false}
      />
      <button type="button">Send broadcast</button>
    </QueryClientProvider>,
  );

  const trigger = await screen.findByRole('button', { name: 'Посмотреть список' });
  trigger.focus();
  fireEvent.click(trigger);

  const dialog = await screen.findByRole('dialog');
  expect(dialog.contains(document.activeElement)).toBe(true);
  expect(fireEvent.keyDown(document, { key: 'Tab', cancelable: true })).toBe(false);
  expect(dialog.contains(document.activeElement)).toBe(true);

  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(trigger);
});
