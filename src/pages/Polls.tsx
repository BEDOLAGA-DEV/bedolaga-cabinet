import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { pollsApi, PollInfo, PollQuestion } from '../api/polls';

const ClipboardIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
    />
  </svg>
);

const GiftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function Polls() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedPoll, setSelectedPoll] = useState<PollInfo | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PollQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [completionMessage, setCompletionMessage] = useState<{
    reward: number | null;
    message: string;
  } | null>(null);

  const {
    data: polls,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['polls'],
    queryFn: pollsApi.getPolls,
  });

  const startPollMutation = useMutation({
    mutationFn: pollsApi.startPoll,
    onSuccess: (data) => {
      setCurrentQuestion(data.question);
      setQuestionIndex(data.current_question_index);
      setTotalQuestions(data.total_questions);
      setCompletionMessage(null);
    },
  });

  const answerMutation = useMutation({
    mutationFn: ({
      responseId,
      questionId,
      optionId,
    }: {
      responseId: number;
      questionId: number;
      optionId: number;
    }) => pollsApi.answerQuestion(responseId, questionId, optionId),
    onSuccess: (data) => {
      if (data.is_completed) {
        setCurrentQuestion(null);
        setCompletionMessage({
          reward: data.reward_granted,
          message: data.message || t('polls.completed'),
        });
        queryClient.invalidateQueries({ queryKey: ['polls'] });
      } else if (data.next_question) {
        setCurrentQuestion(data.next_question);
        setQuestionIndex(data.current_question_index || 0);
        setTotalQuestions(data.total_questions);
      }
    },
  });

  const handleStartPoll = (poll: PollInfo) => {
    setSelectedPoll(poll);
    startPollMutation.mutate(poll.response_id);
  };

  const handleAnswer = (optionId: number) => {
    if (selectedPoll && currentQuestion) {
      answerMutation.mutate({
        responseId: selectedPoll.response_id,
        questionId: currentQuestion.id,
        optionId,
      });
    }
  };

  const handleClosePoll = () => {
    setSelectedPoll(null);
    setCurrentQuestion(null);
    setCompletionMessage(null);
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
      <div className="card border-red-500/20 bg-red-500/10">
        <p className="text-red-400">{t('polls.error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardIcon />
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('polls.title')}</h1>
      </div>

      {/* Poll Modal */}
      {selectedPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="card max-h-[80vh] w-full max-w-lg overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{selectedPoll.title}</h2>
              <button onClick={handleClosePoll} className="text-dark-400 hover:text-dark-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {startPollMutation.isPending && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              </div>
            )}

            {completionMessage && (
              <div className="space-y-4">
                <div className="rounded-lg bg-success-500/20 p-4 text-center text-success-400">
                  <CheckIcon />
                  <p className="mt-2 font-medium">{completionMessage.message}</p>
                  {completionMessage.reward && (
                    <p className="mt-1 text-sm">
                      +{completionMessage.reward} {t('polls.reward')}
                    </p>
                  )}
                </div>
                <button onClick={handleClosePoll} className="btn-secondary w-full">
                  {t('common.close')}
                </button>
              </div>
            )}

            {currentQuestion && !completionMessage && (
              <div className="space-y-4">
                <div className="text-sm text-dark-400">
                  {t('polls.question')} {questionIndex + 1} {t('polls.of')} {totalQuestions}
                </div>
                <div className="h-2 w-full rounded-full bg-dark-700">
                  <div
                    className="h-2 rounded-full bg-accent-500 transition-all"
                    style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
                  />
                </div>

                <p className="text-lg font-medium">{currentQuestion.text}</p>

                <div className="space-y-2">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      disabled={answerMutation.isPending}
                      className="w-full rounded-lg bg-dark-700 p-4 text-left transition-colors hover:bg-dark-600 disabled:opacity-50"
                    >
                      {option.text}
                    </button>
                  ))}
                </div>

                {answerMutation.isPending && (
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Polls List */}
      {polls && polls.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {polls.map((poll) => (
            <div key={poll.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{poll.title}</h3>
                  {poll.description && (
                    <p className="mt-1 text-sm text-dark-400">{poll.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm text-dark-400">
                    <span>
                      {poll.answered_questions}/{poll.total_questions} {t('polls.questions')}
                    </span>
                  </div>
                </div>
                {poll.reward_amount && (
                  <div className="flex items-center gap-1 text-accent-400">
                    <GiftIcon />
                    <span className="text-sm font-medium">+{poll.reward_amount}</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                {poll.is_completed ? (
                  <button disabled className="btn-secondary w-full cursor-not-allowed opacity-50">
                    <CheckIcon />
                    <span className="ml-2">{t('polls.completed')}</span>
                  </button>
                ) : (
                  <button onClick={() => handleStartPoll(poll)} className="btn-primary w-full">
                    {poll.answered_questions > 0 ? t('polls.continue') : t('polls.start')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card py-12 text-center">
          <ClipboardIcon />
          <p className="mt-4 text-dark-400">{t('polls.noPolls')}</p>
        </div>
      )}
    </div>
  );
}
