import apiClient from './client';

export interface PollOption {
  id: number;
  text: string;
  order: number;
}

export interface PollQuestion {
  id: number;
  text: string;
  order: number;
  options: PollOption[];
}

export interface PollInfo {
  id: number;
  response_id: number;
  title: string;
  description: string | null;
  total_questions: number;
  answered_questions: number;
  is_completed: boolean;
  reward_amount: number | null;
}

export interface PollStartResponse {
  response_id: number;
  current_question_index: number;
  total_questions: number;
  question: PollQuestion;
}

export interface PollAnswerResponse {
  success: boolean;
  is_completed: boolean;
  next_question: PollQuestion | null;
  current_question_index: number | null;
  total_questions: number;
  reward_granted: number | null;
  message: string | null;
}

export interface PollsCountResponse {
  count: number;
}

export const pollsApi = {
  // Get count of available polls
  getCount: async (): Promise<PollsCountResponse> => {
    const response = await apiClient.get<PollsCountResponse>('/cabinet/polls/count');
    return response.data;
  },

  // Get available polls
  getPolls: async (): Promise<PollInfo[]> => {
    const response = await apiClient.get<PollInfo[]>('/cabinet/polls');
    return response.data;
  },

  // Get poll details
  getPollDetails: async (responseId: number): Promise<PollInfo> => {
    const response = await apiClient.get<PollInfo>(`/cabinet/polls/${responseId}`);
    return response.data;
  },

  // Start or continue poll
  startPoll: async (responseId: number): Promise<PollStartResponse> => {
    const response = await apiClient.post<PollStartResponse>(`/cabinet/polls/${responseId}/start`);
    return response.data;
  },

  // Answer a question
  answerQuestion: async (
    responseId: number,
    questionId: number,
    optionId: number,
  ): Promise<PollAnswerResponse> => {
    const response = await apiClient.post<PollAnswerResponse>(
      `/cabinet/polls/${responseId}/questions/${questionId}/answer`,
      { option_id: optionId },
    );
    return response.data;
  },
};
