import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { contestsApi, ContestInfo, ContestGameData } from '../api/contests'

const GamepadIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.659-.663 47.703 47.703 0 00-.31-4.82.78.78 0 01.79-.869" />
  </svg>
)

const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
  </svg>
)

export default function Contests() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedContest, setSelectedContest] = useState<ContestInfo | null>(null)
  const [gameData, setGameData] = useState<ContestGameData | null>(null)
  const [result, setResult] = useState<{ is_winner: boolean; message: string } | null>(null)

  const { data: contests, isLoading, error } = useQuery({
    queryKey: ['contests'],
    queryFn: contestsApi.getContests,
  })

  const getGameMutation = useMutation({
    mutationFn: contestsApi.getContestGame,
    onSuccess: (data) => {
      setGameData(data)
      setResult(null)
    },
  })

  const submitAnswerMutation = useMutation({
    mutationFn: ({ roundId, answer }: { roundId: number; answer: string }) =>
      contestsApi.submitAnswer(roundId, answer),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['contests'] })
    },
  })

  const handlePlayContest = async (contest: ContestInfo) => {
    setSelectedContest(contest)
    getGameMutation.mutate(contest.id)
  }

  const handleSubmitAnswer = (answer: string) => {
    if (gameData) {
      submitAnswerMutation.mutate({ roundId: gameData.round_id, answer })
    }
  }

  const handleCloseGame = () => {
    setSelectedContest(null)
    setGameData(null)
    setResult(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-red-500/10 border-red-500/20">
        <p className="text-red-400">{t('contests.error')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GamepadIcon />
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">{t('contests.title')}</h1>
      </div>

      {/* Game Modal */}
      {selectedContest && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bento-card max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedContest.name}</h2>
              <button onClick={handleCloseGame} className="text-dark-400 hover:text-dark-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {getGameMutation.isPending && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {result && (
              <div className={`p-4 rounded-lg mb-4 ${result.is_winner ? 'bg-success-500/20 text-success-400' : 'bg-red-500/20 text-red-400'}`}>
                <p className="font-medium">{result.message}</p>
              </div>
            )}

            {gameData && !result && (
              <div className="space-y-4">
                <p className="text-dark-300">{gameData.instructions}</p>

                {/* Render game based on type */}
                {(gameData.game_type === 'quest' || gameData.game_type === 'locks') && (
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: gameData.game_data.total || gameData.game_data.grid_size || 9 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handleSubmitAnswer(`${i}_${gameData.game_data.secret}`)}
                        disabled={submitAnswerMutation.isPending}
                        className="aspect-square bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center justify-center text-2xl transition-colors"
                      >
                        {gameData.game_type === 'locks' ? '🔒' : '🎛'}
                      </button>
                    ))}
                  </div>
                )}

                {gameData.game_type === 'server' && (
                  <div className="grid grid-cols-5 gap-2">
                    {gameData.game_data.flags?.map((flag: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleSubmitAnswer(flag)}
                        disabled={submitAnswerMutation.isPending}
                        className="p-3 bg-dark-700 hover:bg-dark-600 rounded-lg text-2xl transition-colors"
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
                    className="w-full py-4 bg-accent-500 hover:bg-accent-600 rounded-lg font-bold text-lg transition-colors"
                  >
                    {gameData.game_data.button_text || t('contests.imHere')}
                  </button>
                )}

                {['cipher', 'emoji', 'anagram'].includes(gameData.game_type) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const input = e.currentTarget.elements.namedItem('answer') as HTMLInputElement
                      handleSubmitAnswer(input.value)
                    }}
                    className="space-y-3"
                  >
                    <div className="text-center text-2xl font-mono bg-dark-700 p-4 rounded-lg">
                      {gameData.game_data.question || gameData.game_data.letters}
                    </div>
                    <input
                      name="answer"
                      type="text"
                      placeholder={t('contests.enterAnswer')}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg focus:border-accent-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submitAnswerMutation.isPending}
                      className="w-full btn-primary"
                    >
                      {t('contests.submit')}
                    </button>
                  </form>
                )}
              </div>
            )}

            {result && (
              <button onClick={handleCloseGame} className="w-full btn-secondary mt-4">
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
                  <h3 className="font-semibold text-lg">{contest.name}</h3>
                  {contest.description && (
                    <p className="text-dark-400 text-sm mt-1">{contest.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-accent-400">
                  <TrophyIcon />
                  <span className="text-sm font-medium">+{contest.prize_days} {t('contests.days')}</span>
                </div>
              </div>

              <div className="mt-4">
                {contest.already_played ? (
                  <button disabled className="w-full btn-secondary opacity-50 cursor-not-allowed">
                    {t('contests.alreadyPlayed')}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlayContest(contest)}
                    className="w-full btn-primary"
                  >
                    {t('contests.play')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <GamepadIcon />
          <p className="text-dark-400 mt-4">{t('contests.noContests')}</p>
        </div>
      )}
    </div>
  )
}
