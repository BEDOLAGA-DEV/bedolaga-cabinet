import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { contestsApi, ContestInfo, ContestGameData } from '../api/contests';
import { GamepadIcon, TrophyIcon, XIcon } from '@/components/icons';

export default function Contests() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedContest, setSelectedContest] = useState<ContestInfo | null>(null);
  const [gameData, setGameData] = useState<ContestGameData | null>(null);
  const [result, setResult] = useState<{ is_winner: boolean; message: string } | null>(null);

  const {
    data: contests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contests'],
    queryFn: contestsApi.getContests,
  });

  const getGameMutation = useMutation({
    mutationFn: contestsApi.getContestGame,
    onSuccess: (data) => {
      setGameData(data);
      setResult(null);
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: ({ roundId, answer }: { roundId: number; answer: string }) =>
      contestsApi.submitAnswer(roundId, answer),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['contests'] });
    },
  });

  const handlePlayContest = async (contest: ContestInfo) => {
    setSelectedContest(contest);
    getGameMutation.mutate(contest.id);
  };

  const handleSubmitAnswer = (answer: string) => {
    if (gameData) {
      submitAnswerMutation.mutate({ roundId: gameData.round_id, answer });
    }
  };

  const handleCloseGame = () => {
    setSelectedContest(null);
    setGameData(null);
    setResult(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-error-500/20 bg-error-500/10">
        <p className="text-error-400">{t('contests.error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GamepadIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('contests.title')}</h1>
      </div>

      {/* Game Modal */}
      {selectedContest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-dark-950/70 p-4 backdrop-blur-sm">
          <div
            className="bento-card max-h-[80vh] w-full max-w-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{selectedContest.name}</h2>
              <button onClick={handleCloseGame} className="text-dark-400 hover:text-dark-200">
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            {getGameMutation.isPending && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              </div>
            )}

            {result && (
              <div
                className={`mb-4 rounded-lg p-4 ${result.is_winner ? 'bg-success-500/20 text-success-400' : 'bg-error-500/20 text-error-400'}`}
              >
                <p className="font-medium">{result.message}</p>
              </div>
            )}

            {gameData && !result && (
              <div className="space-y-4">
                <p className="text-dark-300">{gameData.instructions}</p>

                {/* Render game based on type */}
                {(gameData.game_type === 'quest' || gameData.game_type === 'locks') && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {Array.from({
                      length: gameData.game_data.total || gameData.game_data.grid_size || 9,
                    }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handleSubmitAnswer(`${i}_${gameData.game_data.secret}`)}
                        disabled={submitAnswerMutation.isPending}
                        className="flex aspect-square items-center justify-center rounded-lg bg-dark-700 text-2xl transition-colors hover:bg-dark-600"
                      >
                        {gameData.game_type === 'locks' ? '🔒' : '🎛'}
                      </button>
                    ))}
                  </div>
                )}

                {gameData.game_type === 'server' && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {gameData.game_data.flags?.map((flag: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleSubmitAnswer(flag)}
                        disabled={submitAnswerMutation.isPending}
                        className="rounded-lg bg-dark-700 p-3 text-2xl transition-colors hover:bg-dark-600"
                      >
                        {flag}
                      </button>
                    ))}
                  </div>
                )}

                {gameData.game_type === 'blitz' && (
                  <button
                    onClick={() => handleSubmitAnswer('blitz')}
                    disabled={submitAnswerMutation.isPending}
                    className="w-full rounded-lg bg-accent-500 py-4 text-lg font-bold transition-colors hover:bg-accent-600"
                  >
                    {gameData.game_data.button_text || t('contests.imHere')}
                  </button>
                )}

                {['cipher', 'emoji', 'anagram'].includes(gameData.game_type) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem(
                        'answer',
                      ) as HTMLInputElement;
                      handleSubmitAnswer(input.value);
                    }}
                    className="space-y-3"
                  >
                    <div className="rounded-lg bg-dark-700 p-4 text-center font-mono text-2xl">
                      {gameData.game_data.question || gameData.game_data.letters}
                    </div>
                    <input
                      name="answer"
                      type="text"
                      placeholder={t('contests.enterAnswer')}
                      className="w-full rounded-lg border border-dark-600 bg-dark-700 px-4 py-3 focus:border-accent-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submitAnswerMutation.isPending}
                      className="btn-primary w-full"
                    >
                      {t('contests.submit')}
                    </button>
                  </form>
                )}
              </div>
            )}

            {result && (
              <button onClick={handleCloseGame} className="btn-secondary mt-4 w-full">
                {t('common.close')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contests List */}
      {contests && contests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {contests.map((contest) => (
            <div key={contest.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{contest.name}</h3>
                  {contest.description && (
                    <p className="mt-1 text-sm text-dark-400">{contest.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-accent-400">
                  <TrophyIcon />
                  <span className="text-sm font-medium">
                    +{t('contests.days', { count: contest.prize_days })}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                {contest.already_played ? (
                  <button disabled className="btn-secondary w-full cursor-not-allowed opacity-50">
                    {t('contests.alreadyPlayed')}
                  </button>
                ) : (
                  <button onClick={() => handlePlayContest(contest)} className="btn-primary w-full">
                    {t('contests.play')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card py-12 text-center">
          <GamepadIcon className="h-6 w-6" />
          <p className="mt-4 text-dark-400">{t('contests.noContests')}</p>
        </div>
      )}
    </div>
  );
}
