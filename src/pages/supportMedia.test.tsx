// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Support from './Support';

const api = vi.hoisted(() => ({ upload: vi.fn(), create: vi.fn(), reply: vi.fn() }));
const ticket = {
  id: 1,
  title: 'Media check',
  status: 'open',
  updated_at: '2026-10-24T12:00:00Z',
  messages: [],
};
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('../api/info', () => ({
  infoApi: { getSupportConfig: async () => ({ tickets_enabled: true }) },
}));
vi.mock('@/platform', () => ({
  usePlatform: () => ({
    haptic: { impact: vi.fn() },
    openLink: vi.fn(),
    openTelegramLink: vi.fn(),
  }),
}));
vi.mock('../api/tickets', () => ({
  ticketsApi: {
    getTickets: async () => ({ items: [ticket] }),
    getTicket: async () => ticket,
    uploadMedia: api.upload,
    createTicket: api.create,
    addMessage: api.reply,
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  URL.createObjectURL = vi.fn(() => 'blob:masked');
  URL.revokeObjectURL = vi.fn();
  api.upload.mockImplementation(async (file: File) => ({ file_id: `masked_${file.name}` }));
  api.create.mockResolvedValue(ticket);
  api.reply.mockResolvedValue({});
});
afterEach(cleanup);

it.each(['create', 'reply'])('preserves mixed image and video types on %s', async (mode) => {
  const { container } = render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Support />
    </QueryClientProvider>,
  );
  if (mode === 'create') {
    fireEvent.click(await screen.findByRole('button', { name: 'support.newTicket' }));
    fireEvent.change(screen.getByLabelText('support.subject'), {
      target: { value: 'Media check' },
    });
    fireEvent.change(screen.getByLabelText('support.message'), {
      target: { value: 'Synthetic media check' },
    });
  } else {
    fireEvent.click(await screen.findByRole('button', { name: /Media check/ }));
    await screen.findByPlaceholderText('support.replyPlaceholder');
  }
  const input = container.querySelector<HTMLInputElement>('input[type=file]')!;
  const video = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
  const photo = new File(['photo'], 'image.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [video, photo] } });
  await waitFor(() => expect(api.upload).toHaveBeenCalledWith(video, 'video'));
  await waitFor(() => expect(api.upload).toHaveBeenCalledWith(photo, 'photo'));
  await waitFor(() =>
    expect(container.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(false),
  );
  fireEvent.submit(container.querySelector('form')!);
  const payload = {
    media_type: 'video',
    media_file_id: 'masked_clip.mp4',
    media_items: [
      { type: 'video', file_id: 'masked_clip.mp4' },
      { type: 'photo', file_id: 'masked_image.png' },
    ],
  };
  await waitFor(() =>
    expect(mode === 'create' ? api.create : api.reply).toHaveBeenCalledWith(
      ...(mode === 'create' ? ['Media check', 'Synthetic media check', payload] : [1, '', payload]),
    ),
  );
  expect(input.accept).toContain('video/mp4');
});
