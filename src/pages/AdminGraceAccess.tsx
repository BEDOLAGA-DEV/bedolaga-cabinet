import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminGraceAccessApi,
  type GraceAccessConfig,
  type GraceAccessIssue,
  type GraceAccessMode,
  type GraceAccessOverview,
  type GraceSessionFilter,
  type GraceSessionItem,
  type GraceSquadOption,
} from '@/api/adminGraceAccess';
import { AdminBackButton, Toggle } from '@/components/admin';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import {
  AdjustmentsIcon,
  BanIcon,
  BellIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  HeartbeatIcon,
  HistoryIcon,
  LifebuoyIcon,
  LockIcon,
  PowerIcon,
  RestartIcon,
  TagIcon,
  UsersIcon,
  WarningIcon,
} from '@/components/icons';
import { StatCard } from '@/components/stats';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';

/**
 * Grace access: temporary Telegram-only VPN for an expired or traffic-limited
 * subscription, so a user who forgot to pay can still open the bot and renew.
 *
 * The same twelve keys are reachable from the generic settings page, one flat row
 * each. They are grouped here because they only mean anything together — and
 * because two of their failure modes are silent:
 *
 *  - `mode=true` with a missing or malformed squad UUID makes the runtime disable
 *    grace at startup and say so once, in the log;
 *  - the mode is read only while starting, so a saved value changes nothing until
 *    the bot is restarted.
 *
 * Both are stated on screen instead of being left to be discovered in production.
 */

const MODES: GraceAccessMode[] = ['false', 'observe', 'true', 'drain'];

const MODE_ICONS: Record<GraceAccessMode, ReactElement> = {
  false: <BanIcon className="h-5 w-5" />,
  observe: <EyeIcon className="h-5 w-5" />,
  true: <BoltIcon className="h-5 w-5" />,
  drain: <RestartIcon className="h-5 w-5" />,
};

const SESSION_FILTERS: GraceSessionFilter[] = [
  'open',
  'pending',
  'active',
  'restoring',
  'completed',
  'errors',
];

const NUMERIC_FIELDS = [
  'duration_hours',
  'traffic_gb',
  'reconcile_interval_seconds',
  'reconcile_batch_size',
  'candidate_lookback_minutes',
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number];

/**
 * A number field has to be clearable to be retypeable: a strictly numeric state
 * turns an empty box back into the previous number on the next render, so the
 * first character typed lands after it.
 */
export type GraceForm = Omit<GraceAccessConfig, NumericField> & Record<NumericField, number | ''>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 'keep' is not a UUID — it means "leave whatever external squad the user has".
 * The runtime compares it lowercased, so a stored 'Keep' is valid and must not be
 * shown as a malformed UUID.
 */
const EXTERNAL_KEEP = 'keep';

type ExternalChoice = 'detach' | 'keep' | 'custom';

const EXTERNAL_CHOICES: ExternalChoice[] = ['detach', 'keep', 'custom'];

export function externalChoiceOf(value: string): ExternalChoice {
  const normalized = value.trim().toLowerCase();
  if (normalized === '') return 'detach';
  if (normalized === EXTERNAL_KEEP) return 'keep';
  return 'custom';
}

export function toForm(config: GraceAccessConfig): GraceForm {
  return { ...config };
}

/**
 * The same rules the backend enforces, checked while typing.
 *
 * Duplicated on purpose: the server is the authority, but a form that only learns
 * its value is impossible after pressing Save teaches nothing about *which* field
 * is wrong.
 */
export function graceFormIssues(form: GraceForm): GraceAccessIssue[] {
  const issues: GraceAccessIssue[] = [];

  for (const field of ['expired_squad_uuid', 'limited_squad_uuid'] as const) {
    const value = form[field].trim();
    if (!value) {
      issues.push({ field, code: 'squad_required', severity: 'error' });
    } else if (!UUID_PATTERN.test(value)) {
      issues.push({ field, code: 'squad_invalid', severity: 'error' });
    }
  }

  const external = form.external_squad_uuid.trim();
  if (external && external.toLowerCase() !== EXTERNAL_KEEP && !UUID_PATTERN.test(external)) {
    issues.push({ field: 'external_squad_uuid', code: 'squad_invalid', severity: 'error' });
  }

  if (form.traffic_gb === '' || form.traffic_gb < 1) {
    issues.push({ field: 'traffic_gb', code: 'traffic_required', severity: 'error' });
  }

  if (form.notify_user && form.allowed_services.trim() === '') {
    // Сообщение человеку начинается с «доступ только к …» — без фразы оно бессмысленно.
    issues.push({ field: 'allowed_services', code: 'allowed_required', severity: 'error' });
  }

  return issues;
}

/**
 * Number boxes left empty. Saving them is impossible in any mode — unlike the
 * squad rules, which only matter once grace is switched on.
 */
export function emptyNumericFields(form: GraceForm): NumericField[] {
  return NUMERIC_FIELDS.filter((field) => form[field] === '');
}

/** Fields whose value differs from what is stored — the only ones worth sending. */
export function changedFields(
  next: GraceForm,
  stored: GraceAccessConfig,
): Partial<GraceAccessConfig> {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(stored) as (keyof GraceAccessConfig)[]) {
    const value = next[key];
    // A half-typed number is not a value yet; save stays blocked until it is one.
    // Only numbers, though: '' is a real value for the squad fields — for the
    // external one it IS "detach", so skipping every empty string made the safe
    // default the one setting that could never be saved.
    if (value === '' && (NUMERIC_FIELDS as readonly string[]).includes(key)) continue;
    if (value !== stored[key]) patch[key] = value;
  }
  return patch as Partial<GraceAccessConfig>;
}

function useIssueText() {
  const { t } = useTranslation();
  return (issue: GraceAccessIssue) =>
    t(`admin.graceAccess.issue.${issue.code}`, {
      field: t(`admin.graceAccess.fields.${issue.field}`),
      defaultValue: issue.code,
    });
}

// ─── Pieces ───

/**
 * Секция страницы: карточка канона с иконкой, заголовком H2 и подсказкой.
 * Подсказка идёт под заголовком во всю ширину, поэтому aside не уезжает на
 * отдельную строку из-за длинного текста на телефоне.
 */
function SectionCard({
  id,
  icon,
  title,
  hint,
  aside,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  hint?: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="card">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400 [&>svg]:h-5 [&>svg]:w-5"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-x-4">
            <h2 id={id} className="min-w-0 text-lg font-semibold text-dark-100">
              {title}
            </h2>
            {aside && <div className="shrink-0">{aside}</div>}
          </div>
          {hint && <p className="mt-0.5 text-xs text-dark-400">{hint}</p>}
        </div>
      </div>
      {children !== undefined && children !== null && children !== false && (
        <div className="mt-4">{children}</div>
      )}
    </section>
  );
}

function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'warning' | 'error';
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const styles =
    tone === 'error'
      ? 'border-error-500/30 bg-error-500/10 text-error-300'
      : 'border-warning-500/30 bg-warning-500/10 text-warning-300';
  return (
    <div className={cn('rounded-2xl border p-4', styles)}>
      <div className="flex items-center gap-2 font-medium [&>svg]:h-4 [&>svg]:w-4">
        {icon}
        {title}
      </div>
      <div className={cn('mt-1 text-sm', tone === 'error' ? 'text-error-200' : 'text-warning-200')}>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-dark-300">
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-dark-400">{children}</p>;
}

function SquadField({
  id,
  label,
  description,
  value,
  onChange,
  squads,
  squadsAvailable,
  synced,
  disabled,
  invalid,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  squads: GraceSquadOption[];
  squadsAvailable: boolean;
  synced?: boolean;
  disabled: boolean;
  invalid: boolean;
}) {
  const { t } = useTranslation();
  const [manualOverride, setManualOverride] = useState(false);

  const listed = squads.some((squad) => squad.uuid === value);
  // Derived, not synchronised: the squad list arrives after the first render, and
  // a state seeded from the empty list would leave a configured-but-unlisted UUID
  // showing as "not chosen" — one save away from being dropped.
  const manual = manualOverride || (!listed && value.trim() !== '');
  const usePicker = squadsAvailable && squads.length > 0 && !manual;

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {usePicker ? (
        <DropdownSelect
          id={id}
          value={listed ? value : ''}
          disabled={disabled}
          invalid={invalid}
          options={[
            { value: '', label: t('admin.graceAccess.squads.choose') },
            ...squads.map((squad) => ({
              value: squad.uuid,
              label: `${squad.name} · ${t('admin.graceAccess.squads.members', { n: squad.members_count })}`,
            })),
            { value: '__manual__', label: t('admin.graceAccess.squads.manual') },
          ]}
          onChange={(next) => {
            if (next === '__manual__') {
              setManualOverride(true);
              return;
            }
            onChange(next);
          }}
        />
      ) : (
        <input
          id={id}
          type="text"
          className={cn('input font-mono text-xs', invalid && 'border-error-500/50')}
          placeholder="00000000-0000-0000-0000-000000000000"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            // Clearing the box is the way back to the list; without it a manual
            // entry is a one-way door.
            if (event.target.value === '') setManualOverride(false);
            onChange(event.target.value);
          }}
        />
      )}
      <FieldHint>{description}</FieldHint>
      {!squadsAvailable && (
        <p className="mt-1 text-xs text-warning-400">{t('admin.graceAccess.squads.unavailable')}</p>
      )}
      {squadsAvailable && synced && (
        <p className="mt-1 text-xs text-warning-400">{t('admin.graceAccess.squads.synced')}</p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
          : 'bg-dark-800/50 text-dark-400 hover:text-dark-200',
      )}
    >
      {children}
    </button>
  );
}

function SessionState({ session }: { session: GraceSessionItem }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-dark-200">
        {t(`admin.graceAccess.sessions.states.${session.state}`, { defaultValue: session.state })}
      </div>
      {session.completion_reason && (
        <div className="text-xs text-dark-400">
          {t(`admin.graceAccess.sessions.completion.${session.completion_reason}`, {
            defaultValue: session.completion_reason,
          })}
        </div>
      )}
      {session.last_error && (
        <div className="mt-1 break-words text-xs text-error-400">{session.last_error}</div>
      )}
    </>
  );
}

function SessionsSection() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<GraceSessionFilter>('open');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['grace-sessions', filter, page],
    queryFn: () => adminGraceAccessApi.getSessions({ state: filter, page, limit: 20 }),
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const userLine = (session: GraceSessionItem) =>
    session.user?.username ? `@${session.user.username}` : session.user?.telegram_id;

  return (
    <SectionCard
      id="grace-sessions"
      icon={<HistoryIcon />}
      title={t('admin.graceAccess.sessions.title')}
      hint={t('admin.graceAccess.sessions.hint')}
    >
      <div className="flex flex-wrap gap-2">
        {SESSION_FILTERS.map((value) => (
          <FilterChip
            key={value}
            active={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            {t(`admin.graceAccess.sessions.filter.${value}`)}
          </FilterChip>
        ))}
      </div>

      {isLoading && <Skeleton variant="card" className="mt-4 h-40" />}
      {error && (
        <p className="mt-4 text-sm text-error-400">
          {/* Список — это люди, поэтому он требует ещё и users:read. Без него
              «не удалось загрузить» звучит как поломка, а не как право. */}
          {(error as { response?: { status?: number } })?.response?.status === 403
            ? t('admin.graceAccess.sessions.forbidden')
            : t('admin.graceAccess.sessions.loadError')}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="mt-4 text-sm text-dark-400">{t('admin.graceAccess.sessions.empty')}</p>
      )}

      {data && data.items.length > 0 && (
        <>
          {/* Телефон: карточки, как в остальных админских списках. */}
          <ul className="mt-4 space-y-2 md:hidden">
            {data.items.map((session) => (
              <li key={session.id} className="rounded-xl bg-dark-800/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-dark-100">
                      {session.user?.full_name || `#${session.subscription_id}`}
                    </div>
                    <div className="text-xs text-dark-400">{userLine(session)}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <SessionState session={session} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-dark-400">
                  <span>
                    {t(`admin.graceAccess.sessions.reasons.${session.reason}`, {
                      defaultValue: session.reason,
                    })}
                  </span>
                  <span>
                    {t('admin.graceAccess.sessions.until')}:{' '}
                    {new Date(session.grace_until).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-dark-400">
                  <th className="pb-2 pr-3 font-medium">{t('admin.graceAccess.sessions.user')}</th>
                  <th className="pb-2 pr-3 font-medium">
                    {t('admin.graceAccess.sessions.reason')}
                  </th>
                  <th className="pb-2 pr-3 font-medium">{t('admin.graceAccess.sessions.state')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('admin.graceAccess.sessions.until')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((session) => (
                  <tr key={session.id} className="border-t border-dark-700/40 align-top">
                    <td className="py-2 pr-3">
                      <div className="text-dark-100">
                        {session.user?.full_name || `#${session.subscription_id}`}
                      </div>
                      <div className="text-xs text-dark-400">{userLine(session)}</div>
                    </td>
                    <td className="py-2 pr-3 text-dark-300">
                      {t(`admin.graceAccess.sessions.reasons.${session.reason}`, {
                        defaultValue: session.reason,
                      })}
                    </td>
                    <td className="py-2 pr-3">
                      <SessionState session={session} />
                    </td>
                    <td className="py-2 pr-3 text-dark-300">
                      {new Date(session.grace_until).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            {t('common.back')}
          </button>
          <span className="text-dark-400">
            {page} / {pages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Page ───

export default function AdminGraceAccess() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const issueText = useIssueText();

  const { data, isLoading, error } = useQuery<GraceAccessOverview>({
    queryKey: ['grace-access'],
    queryFn: adminGraceAccessApi.getOverview,
  });

  const { data: squads } = useQuery({
    queryKey: ['grace-access-squads'],
    queryFn: adminGraceAccessApi.getSquads,
    staleTime: 60_000,
  });

  const [form, setForm] = useState<GraceForm | null>(null);
  const [externalChoice, setExternalChoice] = useState<ExternalChoice>('detach');
  const [saveError, setSaveError] = useState<string | null>(null);
  // null — ещё не решали: первый ответ сервера раскрывает «Дополнительно», если там
  // есть что показать (настроенный внешний сквад). Дальше блоком управляет только
  // кнопка: вычислять «открыт» из настройки нельзя — она переопределяла бы «Скрыть»
  // (владелец 2026-09-14: «кнопка тупо не работает»), а повторные ответы сервера
  // после сохранения раскрывали бы свёрнутое заново.
  const [showAdvanced, setShowAdvanced] = useState<boolean | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm(toForm(data.config));
    const choice = externalChoiceOf(data.config.external_squad_uuid);
    setExternalChoice(choice);
    setShowAdvanced((current) => current ?? choice !== 'detach');
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<GraceAccessConfig>) => adminGraceAccessApi.update(patch),
    onSuccess: (overview) => {
      setSaveError(null);
      setForm(toForm(overview.config));
      setExternalChoice(externalChoiceOf(overview.config.external_squad_uuid));
      queryClient.setQueryData(['grace-access'], overview);
      queryClient.invalidateQueries({ queryKey: ['grace-sessions'] });
    },
    onError: (mutationError: unknown) => {
      // Через общий разбор: у 422 от FastAPI detail — СПИСОК объектов, и он
      // попадал в JSX массивом, роняя экран вместо показа причины.
      setSaveError(getApiErrorMessage(mutationError, t('admin.graceAccess.saveError')));
    },
  });

  const patch = useMemo(() => (form && data ? changedFields(form, data.config) : {}), [form, data]);
  const dirty = Object.keys(patch).length > 0;

  const formIssues = form ? graceFormIssues(form) : [];
  const blockers = formIssues.filter((issue) => issue.severity === 'error');
  // Squad rules only block saving when the chosen mode needs them: an operator whose
  // config is already broken must still be able to turn grace off or drain it.
  const modeBlockers = form?.mode === 'true' ? blockers : [];
  const emptyNumbers = form ? emptyNumericFields(form) : [];
  // "Replace with a chosen one" with an empty box silently means "detach" — the
  // opposite of what was picked, so it is refused rather than quietly reinterpreted.
  // Сравнение по обрезанной строке: сервер всё равно обрежет, и пробел прошёл бы
  // мимо обеих проверок, а сохранился бы как «Снять» — ровно та подмена, от
  // которой этот флаг и защищает.
  const externalIncomplete =
    externalChoice === 'custom' && (form?.external_squad_uuid ?? '').trim() === '';
  const blocksSave = modeBlockers.length > 0 || emptyNumbers.length > 0 || externalIncomplete;
  const invalidFields = new Set(blockers.map((issue) => issue.field));
  // Ошибка внешнего сквада за свёрнутым блоком не теряется: она продублирована
  // в списке причин у кнопки «Сохранить».
  const advancedOpen = showAdvanced ?? false;

  if (isLoading || (!form && !error)) {
    return (
      <PageSkeleton variant="admin" leading={2} titleWidth="w-56" className="space-y-6">
        <Skeleton variant="card" className="h-96" />
      </PageSkeleton>
    );
  }

  if (error || !data || !form) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin" />
          <h1 className="text-xl font-bold text-dark-100">{t('admin.graceAccess.title')}</h1>
        </div>
        <div className="rounded-2xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.graceAccess.loadError')}</p>
        </div>
      </div>
    );
  }

  const locked = new Set(data.env_locked);
  const isLocked = (field: keyof GraceAccessConfig) => locked.has(field);
  // Пример .env долгое время отдавал все ключи grace раскомментированными, поэтому
  // у скопировавших его раздел открывается целиком нередактируемым. Двенадцать
  // мелких замков этого не объясняют — нужна одна строка о том, что делать.
  const fullyLocked = data.env_locked.length >= Object.keys(data.config).length;
  const restartOnly = new Set(data.restart_only);
  const runningLabel = t(`admin.graceAccess.badge.${data.runtime.running_mode}`, {
    defaultValue: data.runtime.running_mode,
  });

  const update = <K extends keyof GraceForm>(field: K, value: GraceForm[K]) =>
    setForm((current) => (current ? { ...current, [field]: value } : current));

  const updateNumber = (field: NumericField, raw: string) => {
    if (raw === '') return update(field, '');
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) update(field, parsed);
  };

  const lockNote = (field: keyof GraceAccessConfig) =>
    isLocked(field) ? (
      <p className="mt-1 flex items-center gap-1 text-xs text-warning-400">
        <LockIcon className="h-3 w-3" />
        {t('admin.graceAccess.envLocked')}
      </p>
    ) : null;

  const restartNote = (field: keyof GraceAccessConfig) =>
    restartOnly.has(field) ? (
      <p className="mt-1 text-xs text-dark-400">{t('admin.graceAccess.restartOnly')}</p>
    ) : null;

  const numberField = (
    field: NumericField,
    { min, max, description }: { min: number; max: number; description: string },
  ) => (
    <div key={field}>
      <FieldLabel htmlFor={`grace-${field}`}>{t(`admin.graceAccess.fields.${field}`)}</FieldLabel>
      <input
        id={`grace-${field}`}
        type="number"
        min={min}
        max={max}
        className={cn('input', invalidFields.has(field) && 'border-error-500/50')}
        value={form[field]}
        disabled={isLocked(field)}
        onChange={(event) => updateNumber(field, event.target.value)}
      />
      <FieldHint>{description}</FieldHint>
      {restartNote(field)}
      {lockNote(field)}
    </div>
  );

  const openErrors = data.stats.open_errors;
  const completedErrors = data.stats.completed_errors;

  return (
    <div className="animate-fade-in space-y-6 pb-24">
      <header className="flex flex-wrap items-center gap-3">
        <AdminBackButton to="/admin" />
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400"
        >
          <LifebuoyIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-dark-100">{t('admin.graceAccess.title')}</h1>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                data.runtime.running_mode === 'true'
                  ? 'bg-success-500/15 text-success-400'
                  : 'bg-dark-800/50 text-dark-400',
              )}
            >
              {runningLabel}
            </span>
          </div>
          <p className="text-xs text-dark-400">{t('admin.graceAccess.subtitle')}</p>
        </div>
      </header>

      {fullyLocked && (
        <Notice tone="warning" icon={<LockIcon />} title={t('admin.graceAccess.fullyLocked.title')}>
          {t('admin.graceAccess.fullyLocked.body')}
        </Notice>
      )}

      {data.runtime.restart_required && (
        <Notice tone="warning" icon={<RestartIcon />} title={t('admin.graceAccess.restart.title')}>
          {t('admin.graceAccess.restart.body', {
            running: runningLabel,
            configured: t(`admin.graceAccess.badge.${data.runtime.configured_mode}`, {
              defaultValue: data.runtime.configured_mode,
            }),
          })}
        </Notice>
      )}

      {data.issues.length > 0 &&
        (() => {
          // Пока grace выключен, незаполненный сквад — заметка о том, что
          // понадобится при включении, а не авария. Красная рамка на свежей
          // установке приучает не читать этот блок вовсе.
          const severe = data.issues.some((issue) => issue.severity === 'error');
          return (
            <Notice
              tone={severe ? 'error' : 'warning'}
              icon={<WarningIcon />}
              title={
                severe
                  ? t('admin.graceAccess.issues.title')
                  : t('admin.graceAccess.issues.titleBeforeEnabling')
              }
            >
              <ul className="space-y-1">
                {data.issues.map((issue) => (
                  <li key={`${issue.field}-${issue.code}`}>· {issueText(issue)}</li>
                ))}
              </ul>
            </Notice>
          );
        })()}

      <SectionCard
        id="grace-mode"
        icon={<PowerIcon />}
        title={t('admin.graceAccess.modeSection.title')}
        hint={t('admin.graceAccess.modeSection.hint')}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((mode) => {
            const selected = form.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={selected}
                disabled={isLocked('mode')}
                onClick={() => update('mode', mode)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60',
                  selected
                    ? 'border-accent-500/50 bg-accent-500/10'
                    : 'border-dark-700/40 bg-dark-800/30 hover:border-dark-600',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    selected ? 'bg-accent-500/20 text-accent-300' : 'bg-dark-700/60 text-dark-400',
                  )}
                >
                  {MODE_ICONS[mode]}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-sm font-medium',
                      selected ? 'text-dark-100' : 'text-dark-200',
                    )}
                  >
                    {t(`admin.graceAccess.modes.${mode}.label`)}
                  </span>
                  <span className="mt-0.5 block text-xs text-dark-400">
                    {t(`admin.graceAccess.modes.${mode}.desc`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {restartNote('mode')}
        {lockNote('mode')}
      </SectionCard>

      <SectionCard
        id="grace-health"
        icon={<HeartbeatIcon />}
        title={t('admin.graceAccess.health.title')}
      >
        {/* Две карточки, а не четыре: на телефоне длинные подписи переносились на
            две строки, и ряд с иконкой съезжал относительно соседней карточки.
            Ошибки — подстрочником и тоном, а не отдельной карточкой. */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label={t('admin.graceAccess.health.open')}
            value={data.stats.open}
            icon={<LifebuoyIcon />}
            tone={openErrors > 0 ? 'error' : 'accent'}
            subValue={
              openErrors > 0
                ? t('admin.graceAccess.health.withErrors', { n: openErrors })
                : t('admin.graceAccess.health.noErrors')
            }
          />
          <StatCard
            label={t('admin.graceAccess.health.completed')}
            value={data.stats.states.completed ?? 0}
            icon={<CheckCircleIcon />}
            tone={completedErrors > 0 ? 'warning' : 'success'}
            subValue={
              completedErrors > 0
                ? t('admin.graceAccess.health.withErrors', { n: completedErrors })
                : t('admin.graceAccess.health.noErrors')
            }
          />
        </div>

        {data.recent_errors.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-dark-200">
              {t('admin.graceAccess.health.recentErrors')}
            </h3>
            <ul className="mt-2 space-y-2">
              {data.recent_errors.map((row) => (
                <li key={row.id} className="rounded-xl bg-dark-800/30 p-3">
                  <div className="text-xs text-dark-400">
                    {t('admin.graceAccess.health.subscription', { id: row.subscription_id })} ·{' '}
                    {t(`admin.graceAccess.sessions.states.${row.state}`, {
                      defaultValue: row.state,
                    })}
                  </div>
                  <div className="mt-0.5 break-words text-xs text-error-400">{row.last_error}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard
        id="grace-limits"
        icon={<ClockIcon />}
        title={t('admin.graceAccess.limits.title')}
        hint={t('admin.graceAccess.limits.hint')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {numberField('duration_hours', {
            min: 1,
            max: 8760,
            description: t('admin.graceAccess.limits.durationDesc'),
          })}
          {numberField('traffic_gb', {
            min: 0,
            max: 1024,
            description: t('admin.graceAccess.limits.trafficDesc'),
          })}
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="grace-allowed-services">
              {t('admin.graceAccess.fields.allowed_services')}
            </FieldLabel>
            <input
              id="grace-allowed-services"
              type="text"
              maxLength={120}
              className={cn(
                'input',
                invalidFields.has('allowed_services') && 'border-error-500/50',
              )}
              placeholder={t('admin.graceAccess.limits.allowedPlaceholder')}
              value={form.allowed_services}
              disabled={isLocked('allowed_services')}
              onChange={(event) => update('allowed_services', event.target.value)}
            />
            <FieldHint>{t('admin.graceAccess.limits.allowedDesc')}</FieldHint>
            {lockNote('allowed_services')}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="grace-notifications"
        icon={<BellIcon />}
        title={t('admin.graceAccess.notifications.title')}
        hint={t('admin.graceAccess.notifications.hint')}
      >
        <div className="divide-y divide-dark-700/40">
          {(['notify_admins', 'notify_user'] as const).map((field) => (
            <div key={field} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-dark-100">
                  {t(`admin.graceAccess.notifications.${field}`)}
                </div>
                <div className="text-xs text-dark-400">
                  {t(`admin.graceAccess.notifications.${field}Desc`)}
                </div>
                {lockNote(field)}
              </div>
              <Toggle
                checked={form[field]}
                disabled={isLocked(field)}
                aria-label={t(`admin.graceAccess.notifications.${field}`)}
                onChange={() => update(field, !form[field])}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="grace-squads"
        icon={<UsersIcon />}
        title={t('admin.graceAccess.squads.title')}
        hint={t('admin.graceAccess.squads.hint')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <SquadField
              id="grace-expired-squad"
              label={t('admin.graceAccess.fields.expired_squad_uuid')}
              description={t('admin.graceAccess.squads.expiredDesc')}
              value={form.expired_squad_uuid}
              onChange={(value) => update('expired_squad_uuid', value)}
              squads={squads?.items ?? []}
              squadsAvailable={squads?.available ?? true}
              synced={squads?.source === 'synced'}
              disabled={isLocked('expired_squad_uuid')}
              invalid={invalidFields.has('expired_squad_uuid')}
            />
            {lockNote('expired_squad_uuid')}
          </div>
          <div>
            <SquadField
              id="grace-limited-squad"
              label={t('admin.graceAccess.fields.limited_squad_uuid')}
              description={t('admin.graceAccess.squads.limitedDesc')}
              value={form.limited_squad_uuid}
              onChange={(value) => update('limited_squad_uuid', value)}
              squads={squads?.items ?? []}
              squadsAvailable={squads?.available ?? true}
              synced={squads?.source === 'synced'}
              disabled={isLocked('limited_squad_uuid')}
              invalid={invalidFields.has('limited_squad_uuid')}
            />
            {lockNote('limited_squad_uuid')}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="grace-coverage"
        icon={<TagIcon />}
        title={t('admin.graceAccess.coverage.title')}
        hint={t('admin.graceAccess.coverage.hint')}
      >
        <div className="divide-y divide-dark-700/40">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-dark-100">
                {t('admin.graceAccess.coverage.paid')}
              </div>
              <div className="text-xs text-dark-400">
                {t('admin.graceAccess.coverage.paidDesc')}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-success-500/15 px-2.5 py-1 text-xs font-medium text-success-400">
              {t('admin.graceAccess.coverage.always')}
            </span>
          </div>
          {(['trial_enabled', 'daily_enabled', 'free_enabled'] as const).map((field) => (
            <div key={field} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-dark-100">
                  {t(`admin.graceAccess.coverage.${field}`)}
                </div>
                <div className="text-xs text-dark-400">
                  {t(`admin.graceAccess.coverage.${field}Desc`)}
                </div>
                {lockNote(field)}
              </div>
              <Toggle
                checked={form[field]}
                disabled={isLocked(field)}
                aria-label={t(`admin.graceAccess.coverage.${field}`)}
                onChange={() => update(field, !form[field])}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="grace-advanced"
        icon={<AdjustmentsIcon />}
        title={t('admin.graceAccess.reconcile.title')}
        hint={t('admin.graceAccess.reconcile.hint')}
        aside={
          <button
            type="button"
            className="text-sm font-medium text-accent-400 hover:text-accent-300"
            onClick={() => setShowAdvanced((current) => !current)}
            aria-expanded={advancedOpen}
            aria-controls="grace-advanced-body"
          >
            {advancedOpen
              ? t('admin.graceAccess.reconcile.hide')
              : t('admin.graceAccess.reconcile.show')}
          </button>
        }
      >
        {advancedOpen && (
          <div id="grace-advanced-body" className="space-y-6">
            <div>
              <FieldLabel htmlFor="grace-external-squad">
                {t('admin.graceAccess.fields.external_squad_uuid')}
              </FieldLabel>
              <p className="mb-2 text-xs text-dark-400">{t('admin.graceAccess.external.hint')}</p>
              <DropdownSelect
                id="grace-external-squad"
                value={externalChoice}
                disabled={isLocked('external_squad_uuid')}
                options={EXTERNAL_CHOICES.map((choice) => ({
                  value: choice,
                  label: t(`admin.graceAccess.external.${choice}`),
                }))}
                onChange={(raw) => {
                  const next = raw as ExternalChoice;
                  // The choice is its own state: "replace with a chosen one" starts
                  // with an empty box, and deriving the choice from that empty value
                  // would snap the select straight back to "detach".
                  setExternalChoice(next);
                  if (next === 'detach') update('external_squad_uuid', '');
                  if (next === 'keep') update('external_squad_uuid', EXTERNAL_KEEP);
                  if (
                    next === 'custom' &&
                    form.external_squad_uuid.trim().toLowerCase() === EXTERNAL_KEEP
                  ) {
                    update('external_squad_uuid', '');
                  }
                }}
              />
              <FieldHint>{t(`admin.graceAccess.external.${externalChoice}Desc`)}</FieldHint>
              {externalChoice === 'custom' && (
                <input
                  id="grace-external-squad-uuid"
                  type="text"
                  aria-label={t('admin.graceAccess.external.uuid')}
                  className={cn(
                    'input mt-2 font-mono text-xs',
                    (invalidFields.has('external_squad_uuid') || externalIncomplete) &&
                      'border-error-500/50',
                  )}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={
                    externalChoiceOf(form.external_squad_uuid) === 'keep'
                      ? ''
                      : form.external_squad_uuid
                  }
                  disabled={isLocked('external_squad_uuid')}
                  onChange={(event) => update('external_squad_uuid', event.target.value)}
                />
              )}
              {lockNote('external_squad_uuid')}
            </div>

            <div>
              <h3 className="text-sm font-medium text-dark-200">
                {t('admin.graceAccess.reconcile.background')}
              </h3>
              <p className="mt-0.5 text-xs text-dark-400">
                {t('admin.graceAccess.reconcile.backgroundHint')}
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                {numberField('reconcile_interval_seconds', {
                  min: 5,
                  max: 86400,
                  description: t('admin.graceAccess.reconcile.reconcile_interval_secondsDesc'),
                })}
                {numberField('reconcile_batch_size', {
                  min: 1,
                  max: 10000,
                  description: t('admin.graceAccess.reconcile.reconcile_batch_sizeDesc'),
                })}
                {numberField('candidate_lookback_minutes', {
                  min: 1,
                  max: 10080,
                  description: t('admin.graceAccess.reconcile.candidate_lookback_minutesDesc'),
                })}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SessionsSection />

      <div className="sticky bottom-4 z-10">
        <div className="rounded-2xl border border-dark-700/50 bg-dark-900/90 p-3 backdrop-blur">
          {(modeBlockers.length > 0 || emptyNumbers.length > 0 || externalIncomplete) && (
            <ul className="mb-2 space-y-1 text-xs text-error-400">
              {modeBlockers.map((issue) => (
                <li key={`${issue.field}-${issue.code}`}>· {issueText(issue)}</li>
              ))}
              {emptyNumbers.map((field) => (
                <li key={field}>
                  ·{' '}
                  {t('admin.graceAccess.issue.number_required', {
                    field: t(`admin.graceAccess.fields.${field}`),
                  })}
                </li>
              ))}
              {externalIncomplete && (
                <li>
                  ·{' '}
                  {t('admin.graceAccess.issue.squad_required', {
                    field: t('admin.graceAccess.fields.external_squad_uuid'),
                  })}
                </li>
              )}
            </ul>
          )}
          {saveError && <p className="mb-2 text-xs text-error-400">{saveError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={!dirty || blocksSave || saveMutation.isPending}
              onClick={() => saveMutation.mutate(patch)}
            >
              {saveMutation.isPending ? t('admin.graceAccess.saving') : t('admin.graceAccess.save')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => {
                setSaveError(null);
                setForm(toForm(data.config));
                setExternalChoice(externalChoiceOf(data.config.external_squad_uuid));
              }}
            >
              {t('admin.graceAccess.discard')}
            </button>
            {dirty && <span className="text-xs text-dark-400">{t('admin.graceAccess.dirty')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
