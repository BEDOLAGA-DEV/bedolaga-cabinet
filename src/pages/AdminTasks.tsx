import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminTasksApi,
  adminTaskPartnerChannelsApi,
  type Task,
  type TaskListItem,
  type TaskPartnerChannel,
  type TaskPartnerChannelCreateRequest,
  type TaskRewardType,
  type TaskType,
  type TaskUserAudience,
} from '../api/adminTasks';

const TASK_TYPES: { value: TaskType; labelKey: string }[] = [
  { value: 'purchase_tariff', labelKey: 'admin.tasks.types.purchase_tariff' },
  { value: 'subscribe_channel', labelKey: 'admin.tasks.types.subscribe_channel' },
  { value: 'traffic_used', labelKey: 'admin.tasks.types.traffic_used' },
  { value: 'referrals_invited', labelKey: 'admin.tasks.types.referrals_invited' },
  { value: 'purchase_period', labelKey: 'admin.tasks.types.purchase_period' },
  { value: 'spend_amount', labelKey: 'admin.tasks.types.spend_amount' },
  { value: 'multi_tariff', labelKey: 'admin.tasks.types.multi_tariff' },
  { value: 'gift_purchased', labelKey: 'admin.tasks.types.gift_purchased' },
  { value: 'gifts_count', labelKey: 'admin.tasks.types.gifts_count' },
];

const REWARD_TYPES: { value: TaskRewardType; labelKey: string }[] = [
  { value: 'balance', labelKey: 'admin.tasks.rewards.balance' },
  { value: 'subscription_days', labelKey: 'admin.tasks.rewards.subscription_days' },
];

const AUDIENCES: { value: TaskUserAudience; labelKey: string }[] = [
  { value: 'both', labelKey: 'admin.tasks.audience.both' },
  { value: 'telegram', labelKey: 'admin.tasks.audience.telegram' },
  { value: 'email', labelKey: 'admin.tasks.audience.email' },
];

interface PartnerChannelFormState {
  id: number | null;
  channel_id: string;
  title: string;
  channel_link: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

const emptyPartnerForm: PartnerChannelFormState = {
  id: null,
  channel_id: '',
  title: '',
  channel_link: '',
  description: '',
  is_active: true,
  sort_order: 0,
};

function fromPartnerChannel(ch: TaskPartnerChannel): PartnerChannelFormState {
  return {
    id: ch.id,
    channel_id: ch.channel_id,
    title: ch.title,
    channel_link: ch.channel_link || '',
    description: ch.description || '',
    is_active: ch.is_active,
    sort_order: ch.sort_order,
  };
}

function toPartnerPayload(form: PartnerChannelFormState): TaskPartnerChannelCreateRequest {
  return {
    channel_id: form.channel_id.trim(),
    title: form.title.trim(),
    channel_link: form.channel_link.trim() || null,
    description: form.description.trim() || null,
    is_active: form.is_active,
    sort_order: form.sort_order,
  };
}

interface TaskFormState {
  id: number | null;
  title_ru: string;
  title_en: string;
  description_ru: string;
  description_en: string;
  icon: string;
  is_active: boolean;
  task_type: TaskType;
  target_value: number;
  target_meta_json: string;
  reward_type: TaskRewardType;
  reward_value: number;
  reward_meta_json: string;
  allow_user_choice: boolean;
  user_audience: TaskUserAudience;
  promo_group_id: number | '';
  parent_task_id: number | '';
  level: number;
  starts_at: string;
  ends_at: string;
  sort_order: number;
}

const emptyForm: TaskFormState = {
  id: null,
  title_ru: '',
  title_en: '',
  description_ru: '',
  description_en: '',
  icon: '',
  is_active: true,
  task_type: 'referrals_invited',
  target_value: 5,
  target_meta_json: '{}',
  reward_type: 'balance',
  reward_value: 10000,
  reward_meta_json: '{}',
  allow_user_choice: false,
  user_audience: 'both',
  promo_group_id: '',
  parent_task_id: '',
  level: 1,
  starts_at: '',
  ends_at: '',
  sort_order: 0,
};

function fromTask(task: Task): TaskFormState {
  return {
    id: task.id,
    title_ru: task.title?.ru || '',
    title_en: task.title?.en || '',
    description_ru: task.description?.ru || '',
    description_en: task.description?.en || '',
    icon: task.icon || '',
    is_active: task.is_active,
    task_type: task.task_type,
    target_value: task.target_value,
    target_meta_json: JSON.stringify(task.target_meta || {}, null, 2),
    reward_type: task.reward_type,
    reward_value: task.reward_value,
    reward_meta_json: JSON.stringify(task.reward_meta || {}, null, 2),
    allow_user_choice: task.allow_user_choice,
    user_audience: task.user_audience,
    promo_group_id: task.promo_group_id ?? '',
    parent_task_id: task.parent_task_id ?? '',
    level: task.level,
    starts_at: task.starts_at?.slice(0, 16) || '',
    ends_at: task.ends_at?.slice(0, 16) || '',
    sort_order: task.sort_order,
  };
}

function toPayload(form: TaskFormState) {
  let targetMeta: Record<string, unknown> = {};
  let rewardMeta: Record<string, unknown> = {};
  try {
    targetMeta = form.target_meta_json.trim() ? JSON.parse(form.target_meta_json) : {};
  } catch {
    throw new Error('invalid_target_meta_json');
  }
  try {
    rewardMeta = form.reward_meta_json.trim() ? JSON.parse(form.reward_meta_json) : {};
  } catch {
    throw new Error('invalid_reward_meta_json');
  }

  const title: Record<string, string> = {};
  if (form.title_ru.trim()) title.ru = form.title_ru.trim();
  if (form.title_en.trim()) title.en = form.title_en.trim();
  const description: Record<string, string> = {};
  if (form.description_ru.trim()) description.ru = form.description_ru.trim();
  if (form.description_en.trim()) description.en = form.description_en.trim();

  return {
    title,
    description,
    icon: form.icon || null,
    is_active: form.is_active,
    sort_order: form.sort_order,
    task_type: form.task_type,
    target_value: Math.max(1, form.target_value),
    target_meta: targetMeta,
    reward_type: form.reward_type,
    reward_value: Math.max(0, form.reward_value),
    reward_meta: rewardMeta,
    allow_user_choice: form.allow_user_choice,
    user_audience: form.user_audience,
    promo_group_id: form.promo_group_id === '' ? null : Number(form.promo_group_id),
    parent_task_id: form.parent_task_id === '' ? null : Number(form.parent_task_id),
    level: Math.max(1, form.level),
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
  };
}

export default function AdminTasks() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['admin', 'tasks'],
    queryFn: () => adminTasksApi.list(true),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['admin', 'task-partner-channels'],
    queryFn: () => adminTaskPartnerChannelsApi.list(true),
  });

  const createMutation = useMutation({
    mutationFn: adminTasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      setForm(emptyForm);
      setEditing(false);
      setError(null);
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail || err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReturnType<typeof toPayload> }) =>
      adminTasksApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] });
      setForm(emptyForm);
      setEditing(false);
      setError(null);
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail || err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminTasksApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] }),
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail || err.message);
    },
  });

  const [partnerForm, setPartnerForm] = useState<PartnerChannelFormState>(emptyPartnerForm);
  const [partnerEditing, setPartnerEditing] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);

  // Custom confirm dialog: native confirm() unreliable in Telegram WebApp
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);
  const confirmLastFocusedRef = useRef<HTMLElement | null>(null);
  const confirmDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirmState) return;
    confirmLastFocusedRef.current = document.activeElement as HTMLElement | null;
    confirmCancelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setConfirmState(null);
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = confirmDialogRef.current;
      if (!dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
      confirmLastFocusedRef.current?.focus?.();
    };
  }, [confirmState]);

  const partnerInvalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'task-partner-channels'] });

  const createPartnerMutation = useMutation({
    mutationFn: adminTaskPartnerChannelsApi.create,
    onSuccess: () => {
      partnerInvalidate();
      setPartnerForm(emptyPartnerForm);
      setPartnerEditing(false);
      setPartnerError(null);
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setPartnerError(err?.response?.data?.detail || err.message);
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TaskPartnerChannelCreateRequest }) =>
      adminTaskPartnerChannelsApi.update(id, {
        title: payload.title,
        channel_link: payload.channel_link,
        description: payload.description,
        is_active: payload.is_active,
        sort_order: payload.sort_order,
      }),
    onSuccess: () => {
      partnerInvalidate();
      setPartnerForm(emptyPartnerForm);
      setPartnerEditing(false);
      setPartnerError(null);
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setPartnerError(err?.response?.data?.detail || err.message);
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: adminTaskPartnerChannelsApi.remove,
    onSuccess: () => partnerInvalidate(),
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setPartnerError(err?.response?.data?.detail || err.message);
    },
  });

  const handlePartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerError(null);
    const payload = toPartnerPayload(partnerForm);
    if (!payload.channel_id || !payload.title) {
      setPartnerError('channel_id_and_title_required');
      return;
    }
    if (partnerForm.id) {
      updatePartnerMutation.mutate({ id: partnerForm.id, payload });
    } else {
      createPartnerMutation.mutate(payload);
    }
  };

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => a.level - b.level || a.sort_order - b.sort_order || a.id - b.id),
    [tasks],
  );

  const handleEdit = async (item: TaskListItem) => {
    const full = await adminTasksApi.get(item.id);
    setForm(fromTask(full));
    setEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let payload;
    try {
      payload = toPayload(form);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    if (!payload.title.ru && !payload.title.en) {
      setError('title_required');
      return;
    }
    if (form.id) {
      updateMutation.mutate({ id: form.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const labelClass = 'mb-1 block text-sm font-medium text-dark-300';
  const inputClass =
    'w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white outline-none focus:border-accent-500';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('admin.tasks.title')}</h1>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            setEditing(true);
            setError(null);
          }}
          className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-400"
        >
          {t('admin.tasks.create')}
        </button>
      </div>

      {/* Page-level error banner — отображается даже когда форма закрыта (например,
          при ошибке delete). В формах есть свои inline-баннеры для контекста ввода. */}
      {!editing && error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-error-500/40 bg-error-500/10 px-3 py-2 text-sm text-error-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs underline-offset-2 hover:underline"
          >
            {t('common.close')}
          </button>
        </div>
      ) : null}
      {!partnerEditing && partnerError ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-error-500/40 bg-error-500/10 px-3 py-2 text-sm text-error-400">
          <span>{partnerError}</span>
          <button
            type="button"
            onClick={() => setPartnerError(null)}
            className="text-xs underline-offset-2 hover:underline"
          >
            {t('common.close')}
          </button>
        </div>
      ) : null}

      {editing ? (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-2xl border border-dark-700 bg-dark-800/60 p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.title_ru')}</label>
              <input
                className={inputClass}
                value={form.title_ru}
                onChange={(e) => setForm({ ...form, title_ru: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.title_en')}</label>
              <input
                className={inputClass}
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.description_ru')}</label>
              <textarea
                className={inputClass}
                rows={2}
                value={form.description_ru}
                onChange={(e) => setForm({ ...form, description_ru: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.description_en')}</label>
              <textarea
                className={inputClass}
                rows={2}
                value={form.description_en}
                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.task_type')}</label>
              <select
                className={inputClass}
                value={form.task_type}
                onChange={(e) => setForm({ ...form, task_type: e.target.value as TaskType })}
              >
                {TASK_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.target_value')}</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.target_value}
                onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })}
              />
            </div>
          </div>

          {form.task_type === 'subscribe_channel' ? (
            channels.length > 0 ? (
              <div className="rounded-xl border border-accent-500/30 bg-accent-500/5 p-3">
                <label className={labelClass}>
                  {t('admin.tasks.partnerChannels.selectChannel')}
                </label>
                <select
                  className={inputClass}
                  defaultValue=""
                  onChange={(e) => {
                    const ch = channels.find((c) => c.channel_id === e.target.value);
                    if (!ch) return;
                    let meta: Record<string, unknown> = {};
                    try {
                      meta = form.target_meta_json.trim() ? JSON.parse(form.target_meta_json) : {};
                    } catch {
                      meta = {};
                    }
                    meta.channel_id = ch.channel_id;
                    setForm({ ...form, target_meta_json: JSON.stringify(meta, null, 2) });
                  }}
                >
                  <option value="">{t('admin.tasks.partnerChannels.selectPlaceholder')}</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.channel_id}>
                      {c.title} ({c.channel_id})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-dark-400">
                  {t('admin.tasks.partnerChannels.applyChannelHint')}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-warning-500/30 bg-warning-500/5 p-3 text-xs text-warning-300">
                {t('admin.tasks.partnerChannels.empty')}
              </div>
            )
          ) : null}

          <div>
            <label className={labelClass}>
              {t('admin.tasks.fields.target_meta_json')}{' '}
              <span className="text-xs text-dark-500">
                {form.task_type === 'purchase_tariff' && '{ "tariff_id": 12 }'}
                {form.task_type === 'subscribe_channel' && '{ "channel_id": "-1001234" }'}
                {form.task_type === 'purchase_period' && '{ "period_days": 30 }'}
              </span>
            </label>
            <textarea
              className={inputClass + ' font-mono text-xs'}
              rows={3}
              value={form.target_meta_json}
              onChange={(e) => setForm({ ...form, target_meta_json: e.target.value })}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.reward_type')}</label>
              <select
                className={inputClass}
                value={form.reward_type}
                onChange={(e) =>
                  setForm({ ...form, reward_type: e.target.value as TaskRewardType })
                }
              >
                {REWARD_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {form.reward_type === 'balance'
                  ? t('admin.tasks.fields.reward_value_kopeks')
                  : t('admin.tasks.fields.reward_value_days')}
              </label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.reward_value}
                onChange={(e) => setForm({ ...form, reward_value: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-dark-200">
                <input
                  type="checkbox"
                  checked={form.allow_user_choice}
                  onChange={(e) => setForm({ ...form, allow_user_choice: e.target.checked })}
                />
                {t('admin.tasks.fields.allow_user_choice')}
              </label>
            </div>
          </div>

          {form.reward_type === 'subscription_days' ? (
            <div>
              <label className={labelClass}>
                {t('admin.tasks.fields.reward_meta_json')}{' '}
                <span className="text-xs text-dark-500">{`{ "tariff_id": 12 }`}</span>
              </label>
              <textarea
                className={inputClass + ' font-mono text-xs'}
                rows={2}
                value={form.reward_meta_json}
                onChange={(e) => setForm({ ...form, reward_meta_json: e.target.value })}
              />
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.user_audience')}</label>
              <select
                className={inputClass}
                value={form.user_audience}
                onChange={(e) =>
                  setForm({ ...form, user_audience: e.target.value as TaskUserAudience })
                }
              >
                {AUDIENCES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.promo_group_id')}</label>
              <input
                type="number"
                className={inputClass}
                placeholder={t('admin.tasks.fields.any')}
                value={form.promo_group_id}
                onChange={(e) =>
                  setForm({ ...form, promo_group_id: e.target.value ? Number(e.target.value) : '' })
                }
              />
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.parent_task_id')}</label>
              <input
                type="number"
                className={inputClass}
                placeholder={t('admin.tasks.fields.parent_hint')}
                value={form.parent_task_id}
                onChange={(e) =>
                  setForm({ ...form, parent_task_id: e.target.value ? Number(e.target.value) : '' })
                }
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.level')}</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.level}
                onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.sort_order')}</label>
              <input
                type="number"
                className={inputClass}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.starts_at')}</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.ends_at')}</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>{t('admin.tasks.fields.icon')}</label>
              <input
                className={inputClass}
                placeholder="🎯"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-dark-200">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                {t('admin.tasks.fields.is_active')}
              </label>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-error-500/40 bg-error-500/10 px-3 py-2 text-sm text-error-400">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-400 disabled:opacity-50"
            >
              {form.id ? t('admin.tasks.save') : t('admin.tasks.create')}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setEditing(false);
                setError(null);
              }}
              className="rounded-xl bg-dark-700 px-4 py-2 text-sm font-medium text-white hover:bg-dark-600"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mb-6 rounded-2xl border border-dark-700 bg-dark-800/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {t('admin.tasks.partnerChannels.title')}
            </h2>
            <p className="mt-1 text-xs text-dark-400">
              {t('admin.tasks.partnerChannels.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPartnerForm(emptyPartnerForm);
              setPartnerEditing(true);
              setPartnerError(null);
            }}
            className="rounded-xl bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-400"
          >
            {t('admin.tasks.partnerChannels.addChannel')}
          </button>
        </div>

        {partnerEditing ? (
          <form
            onSubmit={handlePartnerSubmit}
            className="mb-3 grid gap-3 rounded-xl border border-dark-700 bg-dark-900/40 p-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>{t('admin.tasks.partnerChannels.channel_id')}</label>
                <input
                  className={inputClass}
                  value={partnerForm.channel_id}
                  disabled={partnerForm.id !== null}
                  onChange={(e) => setPartnerForm({ ...partnerForm, channel_id: e.target.value })}
                  placeholder="-1001234567890"
                />
              </div>
              <div>
                <label className={labelClass}>{t('admin.tasks.partnerChannels.title_field')}</label>
                <input
                  className={inputClass}
                  value={partnerForm.title}
                  onChange={(e) => setPartnerForm({ ...partnerForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('admin.tasks.partnerChannels.channel_link')}
                </label>
                <input
                  className={inputClass}
                  value={partnerForm.channel_link}
                  onChange={(e) => setPartnerForm({ ...partnerForm, channel_link: e.target.value })}
                  placeholder="https://t.me/channel"
                />
              </div>
              <div>
                <label className={labelClass}>{t('admin.tasks.partnerChannels.sort_order')}</label>
                <input
                  type="number"
                  className={inputClass}
                  value={partnerForm.sort_order}
                  onChange={(e) =>
                    setPartnerForm({ ...partnerForm, sort_order: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>{t('admin.tasks.partnerChannels.description')}</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={partnerForm.description}
                  onChange={(e) => setPartnerForm({ ...partnerForm, description: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-dark-200">
                  <input
                    type="checkbox"
                    checked={partnerForm.is_active}
                    onChange={(e) =>
                      setPartnerForm({ ...partnerForm, is_active: e.target.checked })
                    }
                  />
                  {t('admin.tasks.partnerChannels.is_active')}
                </label>
              </div>
            </div>

            {partnerError ? (
              <div className="rounded-xl border border-error-500/40 bg-error-500/10 px-3 py-2 text-sm text-error-400">
                {partnerError}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending}
                className="rounded-xl bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-400 disabled:opacity-50"
              >
                {t('admin.tasks.save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPartnerForm(emptyPartnerForm);
                  setPartnerEditing(false);
                  setPartnerError(null);
                }}
                className="rounded-xl bg-dark-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-dark-600"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-dark-700 p-4 text-center text-xs text-dark-400">
            {t('admin.tasks.partnerChannels.empty')}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {channels.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-dark-700 bg-dark-900/30 p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{c.title}</span>
                    <span className="rounded-full bg-dark-700 px-2 py-0.5 font-mono text-xs text-dark-300">
                      {c.channel_id}
                    </span>
                    {!c.is_active ? (
                      <span className="rounded-full bg-error-500/20 px-2 py-0.5 text-xs text-error-400">
                        {t('admin.tasks.inactive')}
                      </span>
                    ) : null}
                  </div>
                  {c.channel_link ? (
                    <div className="mt-0.5 truncate text-xs text-dark-400">{c.channel_link}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPartnerForm(fromPartnerChannel(c));
                    setPartnerEditing(true);
                    setPartnerError(null);
                  }}
                  className="rounded-md bg-dark-700 px-2 py-1 text-xs font-medium text-white hover:bg-dark-600"
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      message: t('admin.tasks.partnerChannels.confirmDelete'),
                      onConfirm: () => deletePartnerMutation.mutate(c.id),
                    })
                  }
                  className="rounded-md bg-error-500/20 px-2 py-1 text-xs font-medium text-error-400 hover:bg-error-500/30"
                >
                  {t('common.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-dark-300">{t('common.loading')}</div>
      ) : sortedTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dark-700 p-8 text-center text-dark-300">
          {t('admin.tasks.emptyList')}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sortedTasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-dark-700 bg-dark-800/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{task.icon || '⭐'}</span>
                  <span className="font-medium text-white">
                    {task.title?.ru || task.title?.en || `#${task.id}`}
                  </span>
                  <span className="rounded-full bg-dark-700 px-2 py-0.5 text-xs text-dark-300">
                    L{task.level}
                  </span>
                  {!task.is_active ? (
                    <span className="rounded-full bg-error-500/20 px-2 py-0.5 text-xs text-error-400">
                      {t('admin.tasks.inactive')}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-dark-400">
                  {t(`admin.tasks.types.${task.task_type}`)} · {t('admin.tasks.target')}{' '}
                  {task.target_value} ·{' '}
                  {task.reward_type === 'balance'
                    ? `${(task.reward_value / 100).toFixed(2)}₽`
                    : `${task.reward_value}d`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleEdit(task)}
                className="rounded-lg bg-dark-700 px-3 py-1 text-xs font-medium text-white hover:bg-dark-600"
              >
                {t('common.edit')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmState({
                    message: t('admin.tasks.confirmDelete'),
                    onConfirm: () => deleteMutation.mutate(task.id),
                  })
                }
                className="rounded-lg bg-error-500/20 px-3 py-1 text-xs font-medium text-error-400 hover:bg-error-500/30"
              >
                {t('common.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirmState ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur"
          onClick={() => setConfirmState(null)}
          role="presentation"
        >
          <div
            ref={confirmDialogRef}
            className="w-full max-w-sm rounded-2xl border border-dark-700 bg-dark-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-tasks-confirm-title"
          >
            <h2 id="admin-tasks-confirm-title" className="text-base font-semibold text-white">
              {confirmState.message}
            </h2>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(null);
                }}
                className="flex-1 rounded-xl bg-error-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-error-500"
              >
                {t('common.delete')}
              </button>
              <button
                ref={confirmCancelRef}
                type="button"
                onClick={() => setConfirmState(null)}
                className="flex-1 rounded-xl bg-dark-700 px-4 py-2 text-sm font-medium text-white hover:bg-dark-600"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
