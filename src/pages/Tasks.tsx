import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userTasksApi, type UserTaskProgress } from '../api/userTasks';
import { subscriptionApi } from '../api/subscription';

const TASK_TYPE_ICONS: Record<string, string> = {
  purchase_tariff: '🛒',
  subscribe_channel: '📣',
  traffic_used: '📊',
  referrals_invited: '👥',
  purchase_period: '📅',
  spend_amount: '💸',
  multi_tariff: '📦',
  gift_purchased: '🎁',
  gifts_count: '🎁',
};

function pickI18n(map: Record<string, string>, lang: string, fallback = '—'): string {
  if (!map) return fallback;
  return map[lang] || map.ru || map.en || Object.values(map)[0] || fallback;
}

function formatReward(
  task: UserTaskProgress,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (task.reward_type === 'balance') {
    return t('tasks.rewardBalance', { amount: (task.reward_value / 100).toFixed(2) });
  }
  return t('tasks.rewardDays', { count: task.reward_value });
}

interface TaskCardProps {
  task: UserTaskProgress;
  onClaim: () => void;
  isClaiming: boolean;
}

function TaskCard({ task, onClaim, isClaiming }: TaskCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'ru';
  const title = pickI18n(task.title, lang, t('tasks.untitled'));
  const description = pickI18n(task.description, lang, '');
  const icon = task.icon || TASK_TYPE_ICONS[task.task_type] || '⭐';
  const reward = formatReward(task, t);
  const percent = Math.max(0, Math.min(100, task.percent));

  let statusBadge: { bg: string; text: string; label: string };
  if (task.is_claimed) {
    statusBadge = {
      bg: 'bg-success-500/20',
      text: 'text-success-400',
      label: t('tasks.status.claimed'),
    };
  } else if (task.is_completed) {
    statusBadge = {
      bg: 'bg-warning-500/20',
      text: 'text-warning-400',
      label: t('tasks.status.completed'),
    };
  } else {
    statusBadge = {
      bg: 'bg-accent-500/20',
      text: 'text-accent-400',
      label: t('tasks.status.available'),
    };
  }

  return (
    <div className="rounded-2xl border border-dark-700 bg-dark-800/60 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-dark-700 text-2xl">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {title}
              {task.level > 1 ? (
                <span className="ml-2 rounded-full bg-dark-700 px-2 py-0.5 text-xs text-dark-300">
                  {t('tasks.level', { level: task.level })}
                </span>
              ) : null}
            </h3>
            {description ? <p className="mt-1 text-sm text-dark-300">{description}</p> : null}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
        >
          {statusBadge.label}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-dark-300">
          <span>
            {t('tasks.progress', {
              current: task.current_value,
              total: task.target_value,
            })}
          </span>
          <span className="text-dark-400">{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-dark-700">
          <div
            className={`h-full transition-all ${
              task.is_claimed
                ? 'bg-success-500'
                : task.is_completed
                  ? 'bg-warning-500'
                  : 'bg-gradient-to-r from-accent-500 to-accent-400'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-dark-200">
          🎁 {t('tasks.reward')}: {reward}
        </span>
        {task.is_completed && !task.is_claimed ? (
          <button
            type="button"
            onClick={onClaim}
            disabled={isClaiming}
            className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-400 disabled:opacity-50"
          >
            {isClaiming ? t('tasks.claiming') : t('tasks.claim')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function Tasks() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chooserTask, setChooserTask] = useState<UserTaskProgress | null>(null);
  const chooserCloseRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const chooserDialogRef = useRef<HTMLDivElement>(null);

  // ESC handler + focus trap + восстановление фокуса при закрытии
  useEffect(() => {
    if (!chooserTask) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    chooserCloseRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setChooserTask(null);
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = chooserDialogRef.current;
      if (!dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [chooserTask]);

  const { data, isLoading } = useQuery({
    queryKey: ['user', 'tasks'],
    queryFn: () => userTasksApi.list(),
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['user', 'subscriptions', 'for-tasks-chooser'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    enabled: chooserTask !== null,
  });

  const claimMutation = useMutation({
    mutationFn: ({
      taskId,
      chosenSubscriptionId,
    }: {
      taskId: number;
      chosenSubscriptionId?: number;
    }) =>
      userTasksApi.claim(taskId, {
        chosen_subscription_id: chosenSubscriptionId ?? undefined,
      }),
    onSuccess: () => {
      setError(null);
      setChooserTask(null);
    },
    onSettled: () => {
      setClaimingId(null);
      queryClient.invalidateQueries({ queryKey: ['user', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'tasks', 'availability'] });
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      const detail = err?.response?.data?.detail;
      // Если backend требует выбрать подписку — открываем chooser
      if (detail === 'need_choose_subscription' && claimingId) {
        const task = data?.items.find((it) => it.task_id === claimingId);
        if (task) {
          setChooserTask(task);
          setError(null);
          return;
        }
      }
      setError(detail || err.message || 'error');
    },
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  const handleClaim = (taskId: number) => {
    setClaimingId(taskId);
    setError(null);
    claimMutation.mutate({ taskId });
  };

  const handleClaimWithSubscription = (subscriptionId: number) => {
    if (!chooserTask) return;
    setClaimingId(chooserTask.task_id);
    setError(null);
    claimMutation.mutate({ taskId: chooserTask.task_id, chosenSubscriptionId: subscriptionId });
  };

  // Активные платные подписки для chooser'а
  const paidActiveSubs = useMemo(() => {
    if (!subsData?.subscriptions) return [];
    return subsData.subscriptions.filter((s) => !s.is_trial && s.status === 'active');
  }, [subsData]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">{t('tasks.title')}</h1>
        <p className="text-sm text-dark-300">{t('tasks.subtitle')}</p>
        {data?.has_unclaimed ? (
          <p className="rounded-xl bg-warning-500/10 px-3 py-2 text-sm text-warning-400">
            {t('tasks.unclaimedNotice', { count: data.unclaimed_count })}
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-xl border border-error-500/40 bg-error-500/10 px-3 py-2 text-sm text-error-400">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-dark-700 bg-dark-800/60 p-6 text-center text-dark-300">
          {t('common.loading')}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dark-700 bg-dark-800/40 p-8 text-center">
          <p className="text-base font-medium text-white">{t('tasks.empty')}</p>
          <p className="mt-1 text-sm text-dark-300">{t('tasks.emptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((task) => (
            <li key={task.task_id}>
              <TaskCard
                task={task}
                onClaim={() => handleClaim(task.task_id)}
                isClaiming={claimingId === task.task_id}
              />
            </li>
          ))}
        </ul>
      )}

      {chooserTask ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 py-6 backdrop-blur sm:items-center"
          onClick={() => setChooserTask(null)}
          role="presentation"
        >
          <div
            ref={chooserDialogRef}
            className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tasks-chooser-title"
            aria-describedby="tasks-chooser-hint"
          >
            <h2 id="tasks-chooser-title" className="text-lg font-semibold text-white">
              {t('tasks.chooseSubscription')}
            </h2>
            <p id="tasks-chooser-hint" className="mt-1 text-sm text-dark-300">
              {t('tasks.chooseSubscriptionHint')}
            </p>
            {subsLoading ? (
              <p className="mt-3 text-sm text-dark-300">{t('common.loading')}</p>
            ) : paidActiveSubs.length === 0 ? (
              <p className="mt-3 text-sm text-warning-400">{t('tasks.noActiveSubs')}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {paidActiveSubs.map((sub) => (
                  <li key={sub.id}>
                    <button
                      type="button"
                      disabled={claimMutation.isPending}
                      onClick={() => handleClaimWithSubscription(sub.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-dark-700 bg-dark-800 p-3 text-left text-sm text-white transition hover:border-accent-500 disabled:opacity-50"
                    >
                      <span>
                        <span className="block font-medium">{sub.tariff_name || `#${sub.id}`}</span>
                        <span className="block text-xs text-dark-400">
                          {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '—'}
                        </span>
                      </span>
                      <span className="text-accent-400">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              ref={chooserCloseRef}
              type="button"
              onClick={() => setChooserTask(null)}
              className="mt-4 w-full rounded-xl bg-dark-700 px-4 py-2 text-sm font-medium text-white hover:bg-dark-600"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
