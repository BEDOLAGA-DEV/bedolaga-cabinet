import apiClient from './client';

export interface ContestInfo {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  prize_days: number;
  is_available: boolean;
  already_played: boolean;
}

export interface ContestGameData {
  round_id: number;
  game_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game_data: Record<string, any>;
  instructions: string;
}

export interface ContestResult {
  is_winner: boolean;
  message: string;
  prize_days?: number;
}

export interface ContestsCountResponse {
  count: number;
}

export const contestsApi = {
  // Get count of available contests
  getCount: async (): Promise<ContestsCountResponse> => {
    const response = await apiClient.get<ContestsCountResponse>('/cabinet/contests/count');
    return response.data;
  },

  // Get list of available contests
  getContests: async (): Promise<ContestInfo[]> => {
    const response = await apiClient.get<ContestInfo[]>('/cabinet/contests');
    return response.data;
  },

  // Get game data for a specific contest
  getContestGame: async (roundId: number): Promise<ContestGameData> => {
    const response = await apiClient.get<ContestGameData>(`/cabinet/contests/${roundId}`);
    return response.data;
  },

  // Submit answer for a contest
  submitAnswer: async (roundId: number, answer: string): Promise<ContestResult> => {
    const response = await apiClient.post<ContestResult>(`/cabinet/contests/${roundId}/answer`, {
      round_id: roundId,
      answer,
    });
    return response.data;
  },
};
