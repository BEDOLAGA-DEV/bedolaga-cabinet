// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { openLink, navigate, getActive, dismiss } = vi.hoisted(() => ({
  openLink: vi.fn(),
  navigate: vi.fn(),
  getActive: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}));
vi.mock('react-router', async (orig) => ({
  ...(await orig<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/platform', () => ({ usePlatform: () => ({ openLink }) }));
vi.mock('@/api/reminders', () => ({ remindersApi: { getActive, dismiss } }));

import ReminderCards from './ReminderCards';

function renderCards() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ReminderCards />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const card = (id: number, button: unknown = null) => ({
  id,
  title: `T${id}`,
  body: `B${id}\nline`,
  button,
});

describe('ReminderCards', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows at most two cards', async () => {
    getActive.mockResolvedValue([card(1), card(2), card(3)]);
    renderCards();
    expect(await screen.findByText('T1')).toBeTruthy();
    expect(screen.getByText('T2')).toBeTruthy();
    expect(screen.queryByText('T3')).toBeNull();
    expect(getActive).toHaveBeenCalledWith('ru');
  });

  it('hides a card at once and reports the dismiss', async () => {
    getActive.mockResolvedValue([card(1)]);
    dismiss.mockResolvedValue(undefined);
    renderCards();
    fireEvent.click(await screen.findByLabelText('dashboard.reminders.dismiss'));
    await waitFor(() => expect(screen.queryByText('T1')).toBeNull());
    expect(dismiss).toHaveBeenCalledWith(1);
  });

  it('cabinet button navigates, url button opens a link', async () => {
    getActive.mockResolvedValue([
      card(1, { kind: 'cabinet', target: '/profile/accounts', text: 'Go' }),
      card(2, { kind: 'url', target: 'https://x.example', text: 'Open' }),
    ]);
    renderCards();
    fireEvent.click(await screen.findByText('Go'));
    expect(navigate).toHaveBeenCalledWith('/profile/accounts');
    fireEvent.click(screen.getByText('Open'));
    expect(openLink).toHaveBeenCalledWith('https://x.example');
  });

  it('renders nothing without cards', async () => {
    getActive.mockResolvedValue([]);
    const { container } = renderCards();
    await waitFor(() => expect(getActive).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
