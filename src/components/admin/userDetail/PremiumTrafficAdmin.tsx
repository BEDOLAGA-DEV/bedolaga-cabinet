import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  adminPremiumTrafficApi,
  type AdminPremiumTrafficState,
  type PremiumTrafficResetScope,
} from '../../../api/adminPremiumTraffic';
import { getApiErrorMessage } from '../../../utils/api-error';

// ──────────────────────────────────────────────────────────────────
// Премиум-трафик подписки в карточке пользователя: расход по серверам с
// отдельным лимитом, ручное начисление и сброс с выбором, что сбрасывать.
// Самостоятельный блок: сам грузит и сам меняет данные, родитель передаёт
// только подписку и права (домашнее соглашение, см. ActivityTab).
//
// Сервер, снятый за перерасход, возвращает не сам запрос, а ближайший
// проход воркера — так админское действие не зависит от доступности панели.
// ──────────────────────────────────────────────────────────────────

export interface PremiumTrafficAdminProps {
  subscriptionId: number;
  /** Право `traffic:manage`: без него блок только показывает расход. */
  canManage: boolean;
  formatDate: (date: string | null) => string;
  /** Общий трафик сброшен в панели — родителю перечитать подписку. */
  onRegularReset?: () => void | Promise<void>;
}

const SCOPES: PremiumTrafficResetScope[] = ['premium', 'regular', 'both'];
const MAX_GRANT_GB = 100_000;
const KEY = 'admin.users.detail.premiumTraffic';

type Notice = { kind: 'ok' | 'error'; text: string };

function formatGb(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function PremiumTrafficAdmin({
  subscriptionId,
  canManage,
  formatDate,
  onRegularReset,
}: PremiumTrafficAdminProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ['admin-premium-traffic', subscriptionId];
  const { data: states } = useQuery({
    queryKey,
    queryFn: () => adminPremiumTrafficApi.getStates(subscriptionId),
  });

  const [scope, setScope] = useState<PremiumTrafficResetScope>('premium');
  // Ключ действия, ждущего второго нажатия. Один на блок: взведённое
  // подтверждение не должно пережить переход к другому действию.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const fail = (err: unknown) =>
    setNotice({ kind: 'error', text: getApiErrorMessage(err, t(`${KEY}.error`)) });

  const grant = useMutation({
    mutationFn: (vars: { state: AdminPremiumTrafficState; gb: number }) =>
      adminPremiumTrafficApi.grant(subscriptionId, vars.state.squad_uuid, vars.gb),
    onSuccess: (result, vars) => {
      const done = t(`${KEY}.granted`, { gb: vars.gb, name: displayName(vars.state) });
      setNotice({
        kind: 'ok',
        text: result.squad_restored ? `${done} ${t(`${KEY}.restoredNote`)}` : done,
      });
      void refresh();
    },
    onError: fail,
  });

  const reset = useMutation({
    mutationFn: (vars: { scope: PremiumTrafficResetScope; state?: AdminPremiumTrafficState }) =>
      adminPremiumTrafficApi.reset(subscriptionId, vars.scope, vars.state?.squad_uuid),
    onSuccess: async (result, vars) => {
      const parts: string[] = [];
      if (result.regular_reset) parts.push(t(`${KEY}.resetRegularDone`));
      if (result.premium_squads.length > 0) {
        parts.push(t(`${KEY}.resetPremiumDone`));
        const wasLimited = vars.state
          ? vars.state.is_limited
          : (states ?? []).some(
              (s) => s.is_limited && result.premium_squads.includes(s.squad_uuid),
            );
        if (wasLimited) parts.push(t(`${KEY}.restoredNote`));
      }
      setNotice({ kind: 'ok', text: parts.join(' ') });
      if (result.regular_reset) await onRegularReset?.();
      void refresh();
    },
    onError: fail,
  });

  // Премиум-серверов в тарифе нет — блоку показывать нечего.
  if (!states || states.length === 0) return null;

  const busy = grant.isPending || reset.isPending;
  const confirmThen = (key: string, run: () => void) => {
    if (confirming === key) {
      setConfirming(null);
      run();
    } else {
      setConfirming(key);
    }
  };
  const areYouSure = t('admin.users.detail.actions.areYouSure');

  return (
    <div className="rounded-xl bg-dark-800/50 p-4">
      <div className="mb-3 text-sm font-medium text-dark-200">{t(`${KEY}.title`)}</div>

      <div className="space-y-3">
        {states.map((state) => {
          const resetKey = `reset_squad_${state.squad_uuid}`;
          return (
            <PremiumStateRow
              key={state.squad_uuid}
              state={state}
              canManage={canManage}
              busy={busy}
              formatDate={formatDate}
              resetLabel={confirming === resetKey ? areYouSure : t(`${KEY}.resetSquad`)}
              resetArmed={confirming === resetKey}
              onGrant={(gb) => {
                setConfirming(null);
                grant.mutate({ state, gb });
              }}
              onReset={() => confirmThen(resetKey, () => reset.mutate({ scope: 'premium', state }))}
            />
          );
        })}
      </div>

      {canManage && (
        <div className="mt-4 border-t border-dark-700/50 pt-4">
          <div className="mb-2 text-sm font-medium text-dark-200">{t(`${KEY}.resetTitle`)}</div>
          <div className="flex gap-2">
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as PremiumTrafficResetScope);
                setConfirming(null);
              }}
              aria-label={t(`${KEY}.resetTitle`)}
              className="input flex-1"
            >
              {SCOPES.map((value) => (
                <option key={value} value={value}>
                  {t(`${KEY}.scope.${value}`)}
                </option>
              ))}
            </select>
            <button
              onClick={() => confirmThen(`reset_${scope}`, () => reset.mutate({ scope }))}
              disabled={busy}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                confirming === `reset_${scope}`
                  ? 'bg-error-500 text-white'
                  : 'bg-error-500/15 text-error-400 hover:bg-error-500/25'
              }`}
            >
              {confirming === `reset_${scope}` ? areYouSure : t(`${KEY}.resetButton`)}
            </button>
          </div>
          <div className="mt-2 text-xs text-dark-500">{t(`${KEY}.scopeHint.${scope}`)}</div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`mt-3 text-xs ${notice.kind === 'ok' ? 'text-success-400' : 'text-error-400'}`}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}

function displayName(state: AdminPremiumTrafficState): string {
  return state.name || state.squad_uuid.slice(0, 8);
}

interface PremiumStateRowProps {
  state: AdminPremiumTrafficState;
  canManage: boolean;
  busy: boolean;
  formatDate: (date: string | null) => string;
  resetLabel: string;
  resetArmed: boolean;
  onGrant: (gb: number) => void;
  onReset: () => void;
}

function PremiumStateRow({
  state,
  canManage,
  busy,
  formatDate,
  resetLabel,
  resetArmed,
  onGrant,
  onReset,
}: PremiumStateRowProps) {
  const { t } = useTranslation();
  // Текстом, а не числом: иначе очищенное поле тут же превращалось бы в «0».
  const [gb, setGb] = useState('');
  const amount = Number(gb);
  const valid = gb !== '' && Number.isInteger(amount) && amount >= 1 && amount <= MAX_GRANT_GB;

  const total = state.limit_gb + state.extra_gb;
  const percent = total > 0 ? Math.min(100, (state.used_gb / total) * 100) : 0;
  const units = t('common.units.gb');
  const name = displayName(state);

  return (
    <div className="rounded-lg bg-dark-700/50 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-dark-200">{name}</span>
        {state.is_limited ? (
          <span className="shrink-0 rounded-full bg-error-500/20 px-1.5 py-0.5 text-[10px] text-error-400">
            {t(`${KEY}.limited`)}
          </span>
        ) : !state.has_state ? (
          <span className="shrink-0 rounded-full bg-dark-600/60 px-1.5 py-0.5 text-[10px] text-dark-300">
            {t(`${KEY}.notMeasured`)}
          </span>
        ) : null}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-dark-400">
        <span>
          {formatGb(state.used_gb)} / {formatGb(total)} {units}
        </span>
        {state.extra_gb > 0 && <span>{t(`${KEY}.extra`, { gb: formatGb(state.extra_gb) })}</span>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-dark-600/50">
        <div
          className={`h-full rounded-full ${state.is_limited ? 'bg-error-500' : 'bg-accent-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {state.period_start_at && (
        <div className="mt-2 text-xs text-dark-500">
          {t(`${KEY}.period`, { date: formatDate(state.period_start_at) })}
          {state.last_checked_at &&
            ` · ${t(`${KEY}.checked`, { date: formatDate(state.last_checked_at) })}`}
        </div>
      )}

      {canManage && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={gb}
            onChange={(e) => setGb(e.target.value.replace(/\D/g, ''))}
            placeholder={units}
            aria-label={t(`${KEY}.grantLabel`, { name })}
            className="input w-24"
          />
          <button
            onClick={() => {
              onGrant(amount);
              setGb('');
            }}
            disabled={busy || !valid}
            className="shrink-0 rounded-lg bg-accent-500 px-3 py-2 text-sm text-on-accent transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            {t(`${KEY}.grant`)}
          </button>
          <button
            onClick={onReset}
            disabled={busy}
            className={`ml-auto shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
              resetArmed
                ? 'bg-error-500 text-white'
                : 'bg-error-500/15 text-error-400 hover:bg-error-500/25'
            }`}
          >
            {resetLabel}
          </button>
        </div>
      )}
    </div>
  );
}
