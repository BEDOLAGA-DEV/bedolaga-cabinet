// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Polls from './Polls';

const mocks = vi.hoisted(() => ({
  getPolls: vi.fn(),
  startPoll: vi.fn(),
  answerQuestion: vi.fn(),
  formatPositive: vi.fn((rubles: number) => `+${rubles} RUB`),
}));
vi.mock('../api/polls', () => ({ pollsApi: mocks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({ formatPositive: mocks.formatPositive }),
}));
let client: QueryClient;
afterEach(() => {
  cleanup();
  client?.clear();
  vi.clearAllMocks();
});

it.each([12345, 0, null])(
  'formats reward %s in kopeks without changing the submitted answer',
  async (reward) => {
    mocks.getPolls.mockResolvedValue([
      {
        id: 1,
        response_id: 7,
        title: 'Example poll',
        description: null,
        total_questions: 1,
        answered_questions: 0,
        is_completed: false,
        reward_amount: 123,
      },
    ]);
    mocks.startPoll.mockResolvedValue({
      response_id: 7,
      total_questions: 1,
      current_question_index: 1,
      question: {
        id: 8,
        text: 'Example question',
        options: [{ id: 9, text: 'Example answer', order: 1 }],
      },
    });
    mocks.answerQuestion.mockResolvedValue({
      success: true,
      is_completed: true,
      total_questions: 1,
      reward_granted: reward,
      message: 'Thank you for completing the poll!',
    });
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <Polls />
      </QueryClientProvider>,
    );
    await screen.findByText('Example poll');
    expect(screen.getByText('+123 RUB')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'polls.start' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Example answer' }));
    expect(await screen.findByText('polls.completedThanks')).toBeTruthy();
    expect(mocks.answerQuestion).toHaveBeenCalledWith(7, 8, 9);
    if (reward) {
      expect(screen.getByText('+123.45 RUB')).toBeTruthy();
      expect(mocks.formatPositive).toHaveBeenCalledWith(123.45);
      expect(mocks.formatPositive).not.toHaveBeenCalledWith(12345);
    } else {
      expect(screen.queryByText('+0 RUB')).toBeNull();
    }
  },
);
