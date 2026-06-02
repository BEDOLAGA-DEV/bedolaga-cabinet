import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { pollsApi, PollInfo, PollQuestion } from '../api/polls';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ClipboardIcon, GiftIcon, CheckIcon, CloseIcon } from '@/components/icons';

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

  const pollDialogRef = useFocusTrap<HTMLDivElement>(!!selectedPoll, {
    onEscape: handleClosePoll,
  });

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
        <p className="text-error-400">{t('polls.error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('polls.title')}</h1>
      </div>

      {/* Poll Modal */}
      {selectedPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark-950/60"
            onClick={handleClosePoll}
            aria-hidden="true"
          />
          <div
            ref={pollDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="poll-dialog-title"
            tabIndex={-1}
            className="card relative max-h-[80vh] w-full max-w-lg overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="poll-dialog-title" className="text-xl font-bold">
                {selectedPoll.title}
              </h2>
              <button
                onClick={handleClosePoll}
                aria-label={t('common.close')}
                className="text-dark-400 hover:text-dark-200"
              >
                <CloseIcon className="h-6 w-6" />
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
                  <CheckIcon className="h-5 w-5" />
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
                      {poll.answered_questions}/
                      {t('polls.questions', { count: poll.total_questions })}
                    </span>
                  </div>
                </div>
                {poll.reward_amount && (
                  <div className="flex items-center gap-1 text-accent-400">
                    <GiftIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">+{poll.reward_amount}</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                {poll.is_completed ? (
                  <button disabled className="btn-secondary w-full cursor-not-allowed opacity-50">
                    <CheckIcon className="h-5 w-5" />
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
          <ClipboardIcon className="h-6 w-6" />
          <p className="mt-4 text-dark-400">{t('polls.noPolls')}</p>
        </div>
      )}
    </div>
  );
}
