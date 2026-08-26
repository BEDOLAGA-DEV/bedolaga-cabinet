import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi } from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { SettingsIcon } from '@/components/icons';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import type { ReferralRewardLevel } from '../types';

/**
 * Reward levels of the referral chain.
 *
 * Each level decides which bonuses are active (money, subscription days, or both),
 * what triggers them, how much goes to the referrer and how much to the invited
 * user, and which tariff the days land in.
 *
 * The rules live in their own table rather than in Settings: a key present in .env
 * lands in ENV_OVERRIDE_KEYS and stops being editable from any UI, which is exactly
 * how the rest of the referral section usually ends up locked.
 */

const REWARD_MODES: ReferralRewardLevel['reward_mode'][] = ['money', 'days', 'both'];
const TRIGGERS: ReferralRewardLevel['trigger'][] = ['registration', 'first_topup', 'every_topup'];

/** Both interfaces write the same table, so only touched fields are sent. */
type LevelPatch = Partial<
  Omit<ReferralRewardLevel, 'level' | 'referrer_tariff_name' | 'referee_tariff_name'>
>;

export default function AdminReferralLevels() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['referral-levels'],
    queryFn: partnerApi.getReferralLevels,
  });

  // Без onError страница молчала на любой отказ сервера — включая 409 на
  // залоченной в .env схеме и 400 на выходе за границу уровней. Админ видел, что
  // «ничего не произошло», и не знал почему.
  const [saveError, setSaveError] = useState<string | null>(null);

  const invalidate = () => {
    setSaveError(null);
    queryClient.invalidateQueries({ queryKey: ['referral-levels'] });
    queryClient.invalidateQueries({ queryKey: ['referral-terms'] });
  };

  const reportError = (error: unknown) => {
    const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
    setSaveError(detail || t('admin.referralLevels.saveError'));
  };

  const saveMutation = useMutation({
    mutationFn: ({ level, patch }: { level: number; patch: LevelPatch }) =>
      partnerApi.upsertReferralLevel(level, patch),
    onSuccess: invalidate,
    onError: reportError,
  });

  const deleteMutation = useMutation({
    mutationFn: (level: number) => partnerApi.deleteReferralLevel(level),
    onSuccess: invalidate,
    onError: reportError,
  });

  const [importNotes, setImportNotes] = useState<string[]>([]);

  const importMutation = useMutation({
    mutationFn: partnerApi.importLegacyReferralSettings,
    onSuccess: (result) => {
      // Что перенос не смог выразить уровнем. Показывается явно: молча потерять
      // ступени комиссии хуже, чем сообщить о них.
      setImportNotes(result.import_notes ?? []);
      invalidate();
    },
    onError: reportError,
  });

  const schemeMutation = useMutation({
    mutationFn: (scheme: 'legacy' | 'levels') => partnerApi.updateReferralScheme(scheme),
    onSuccess: invalidate,
    onError: reportError,
  });

  if (isLoading) {
    return (
      <PageSkeleton variant="admin" leading={2} titleWidth="w-56" className="space-y-6">
        <Skeleton variant="card" className="h-96" />
      </PageSkeleton>
    );
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/partners/settings" />
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.referralLevels.title')}</h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.referralLevels.loadError')}</p>
        </div>
      </div>
    );
  }

  const isLevels = data.scheme === 'levels';
  const nextLevel = data.levels.reduce((max, lvl) => Math.max(max, lvl.level), 0) + 1;
  const hasActiveLevel = data.levels.some((lvl) => lvl.is_active);

  const save = (level: number, patch: LevelPatch) => saveMutation.mutate({ level, patch });

  const cycle = <T,>(values: T[], current: T): T =>
    values[(Math.max(0, values.indexOf(current)) + 1) % values.length];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/partners/settings" />
        <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.referralLevels.title')}</h1>
          <p className="text-sm text-dark-400">{t('admin.referralLevels.subtitle')}</p>
        </div>
      </div>

      {/* Scheme switch */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium text-dark-100">
              {isLevels
                ? t('admin.referralLevels.schemeLevels')
                : t('admin.referralLevels.schemeLegacy')}
            </div>
            <div className="text-sm text-dark-500">
              {isLevels
                ? t('admin.referralLevels.depth', { count: data.max_level_depth })
                : t('admin.referralLevels.schemeLegacyHint')}
            </div>
          </div>
          <button
            type="button"
            disabled={data.scheme_locked_by_env || schemeMutation.isPending}
            onClick={() => schemeMutation.mutate(isLevels ? 'legacy' : 'levels')}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLevels
              ? t('admin.referralLevels.switchToLegacy')
              : t('admin.referralLevels.switchToLevels')}
          </button>
        </div>

        {data.scheme_locked_by_env && (
          <p className="mt-3 rounded-xl border border-warning-500/30 bg-warning-500/10 p-3 text-sm text-warning-400">
            {t('admin.referralLevels.envLocked')}
          </p>
        )}

        {isLevels && !hasActiveLevel && (
          <p className="mt-3 rounded-xl border border-warning-500/30 bg-warning-500/10 p-3 text-sm text-warning-400">
            {t('admin.referralLevels.noActiveLevels')}
          </p>
        )}
      </div>

      {data.levels.length === 0 && (
        // Показывается только на пустой таблице: правило создаётся выключенным,
        // и повторный перенос сервер отклоняет.
        <button
          type="button"
          onClick={() => importMutation.mutate()}
          disabled={importMutation.isPending}
          className="btn-secondary mb-4 w-full"
        >
          {t('admin.referralLevels.importLegacy')}
        </button>
      )}

      {importNotes.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-xl border border-warning-500/30 bg-warning-500/10 p-3 text-sm text-warning-400">
          {importNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {saveError && (
        <p className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
          {saveError}
        </p>
      )}

      {/* Levels */}
      <div className="space-y-4">
        {data.levels.map((level) => (
          <div key={level.level} className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-dark-100">
                  {t('admin.referralLevels.levelTitle', { count: level.level })}
                </h3>
                {level.level > data.max_level_depth && (
                  <p className="text-xs text-warning-400">
                    {t('admin.referralLevels.beyondDepth', { count: data.max_level_depth })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => save(level.level, { is_active: !level.is_active })}
                  className={level.is_active ? 'btn-secondary' : 'btn-primary'}
                >
                  {level.is_active
                    ? t('admin.referralLevels.disable')
                    : t('admin.referralLevels.enable')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(level.level)}
                  className="btn-secondary text-error-400"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  save(level.level, { reward_mode: cycle(REWARD_MODES, level.reward_mode) })
                }
                className="rounded-xl border border-dark-700/30 bg-dark-800/30 p-3 text-left"
              >
                <div className="text-xs text-dark-500">
                  {t('admin.referralLevels.activeBonuses')}
                </div>
                <div className="font-medium text-dark-100">
                  {t(`admin.referralLevels.modes.${level.reward_mode}`)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => save(level.level, { trigger: cycle(TRIGGERS, level.trigger) })}
                className="rounded-xl border border-dark-700/30 bg-dark-800/30 p-3 text-left"
              >
                <div className="text-xs text-dark-500">{t('admin.referralLevels.trigger')}</div>
                <div className="font-medium text-dark-100">
                  {t(`admin.referralLevels.triggers.${level.trigger}`)}
                </div>
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium text-dark-300">
                  {t('admin.referralLevels.toReferrer')}
                </div>
                <NumberField
                  label={t('admin.referralLevels.percent')}
                  value={level.referrer_percent ?? ''}
                  disabled={level.reward_mode === 'days'}
                  max={100}
                  onCommit={(parsed) => save(level.level, { referrer_percent: parsed })}
                  onInvalid={(name) =>
                    setSaveError(t('admin.referralLevels.invalidValue', { field: name }))
                  }
                />
                <NumberField
                  label={t('admin.referralLevels.fixedAmount')}
                  value={level.referrer_fixed_kopeks ? level.referrer_fixed_kopeks / 100 : ''}
                  disabled={level.reward_mode === 'days'}
                  scale={100}
                  onCommit={(parsed) => save(level.level, { referrer_fixed_kopeks: parsed })}
                  onInvalid={(name) =>
                    setSaveError(t('admin.referralLevels.invalidValue', { field: name }))
                  }
                />
                <NumberField
                  label={t('admin.referralLevels.days')}
                  value={level.referrer_days || ''}
                  disabled={level.reward_mode === 'money'}
                  max={3650}
                  onCommit={(parsed) => save(level.level, { referrer_days: parsed ?? 0 })}
                  onInvalid={(name) =>
                    setSaveError(t('admin.referralLevels.invalidValue', { field: name }))
                  }
                />
                {level.reward_mode !== 'money' &&
                  level.referrer_days > 0 &&
                  !level.referrer_tariff_id && (
                    <p className="mt-1 text-xs text-dark-500">
                      {t('admin.referralLevels.noTariffHint')}
                    </p>
                  )}
                <TariffSelect
                  label={t('admin.referralLevels.tariff')}
                  value={level.referrer_tariff_id}
                  options={data.available_tariffs}
                  disabled={level.reward_mode === 'money'}
                  noneLabel={t('admin.referralLevels.mainSubscription')}
                  onChange={(tariffId) => save(level.level, { referrer_tariff_id: tariffId })}
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-dark-300">
                  {t('admin.referralLevels.toReferee')}
                </div>
                <NumberField
                  label={t('admin.referralLevels.fixedAmount')}
                  value={level.referee_fixed_kopeks ? level.referee_fixed_kopeks / 100 : ''}
                  disabled={level.reward_mode === 'days'}
                  scale={100}
                  onCommit={(parsed) => save(level.level, { referee_fixed_kopeks: parsed })}
                  onInvalid={(name) =>
                    setSaveError(t('admin.referralLevels.invalidValue', { field: name }))
                  }
                />
                <NumberField
                  label={t('admin.referralLevels.days')}
                  value={level.referee_days || ''}
                  disabled={level.reward_mode === 'money'}
                  max={3650}
                  onCommit={(parsed) => save(level.level, { referee_days: parsed ?? 0 })}
                  onInvalid={(name) =>
                    setSaveError(t('admin.referralLevels.invalidValue', { field: name }))
                  }
                />
                <TariffSelect
                  label={t('admin.referralLevels.tariff')}
                  value={level.referee_tariff_id}
                  options={data.available_tariffs}
                  disabled={level.reward_mode === 'money'}
                  noneLabel={t('admin.referralLevels.mainSubscription')}
                  onChange={(tariffId) => save(level.level, { referee_tariff_id: tariffId })}
                />
                {level.trigger === 'registration' &&
                  level.reward_mode !== 'money' &&
                  level.referee_days > 0 &&
                  !level.referee_tariff_id && (
                    <p className="mt-2 rounded-lg border border-warning-500/30 bg-warning-500/10 p-2 text-xs text-warning-400">
                      {t('admin.referralLevels.registrationNeedsTariff')}
                    </p>
                  )}
              </div>
            </div>

            <div className="mt-4">
              <NumberField
                label={t('admin.referralLevels.maxPayments')}
                value={level.max_payments || ''}
                disabled={false}
                onCommit={(parsed) => save(level.level, { max_payments: parsed ?? 0 })}
                onInvalid={(name) =>
                  setSaveError(t('admin.referralLevels.invalidValue', { field: name }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      {nextLevel <= data.max_supported_level && (
        <button
          type="button"
          onClick={() =>
            // A new level starts disabled: creating it live would begin paying from a
            // half-filled rule on the very next top-up.
            save(nextLevel, { is_active: false, reward_mode: 'money', trigger: 'every_topup' })
          }
          className="btn-primary mt-6"
          disabled={saveMutation.isPending}
        >
          {t('admin.referralLevels.addLevel', { count: nextLevel })}
        </button>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  disabled,
  max,
  scale = 1,
  onCommit,
  onInvalid,
}: {
  label: string;
  value: number | string;
  disabled?: boolean;
  /** Upper bound; values above it are rejected with a message. */
  max?: number;
  /** 1 for plain integers, 100 for money entered in rubles and stored in kopeks. */
  scale?: number;
  /** Receives the parsed value, or null for "not granted". */
  onCommit: (parsed: number | null) => void;
  onInvalid: (message: string) => void;
}) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-xs text-dark-500">{label}</span>
      <input
        // Remounted whenever the server value changes, so a normalized or
        // rejected entry is replaced by what was actually stored. An uncontrolled
        // input without this keeps showing whatever the admin typed, which reads
        // as "saved" when nothing was.
        key={String(value)}
        type="text"
        inputMode="decimal"
        defaultValue={String(value)}
        disabled={disabled}
        // Committed on blur rather than per keystroke: each save is a round trip
        // that re-renders the whole list, and firing one per character would both
        // hammer the API and fight the cursor.
        onBlur={(e) => {
          const raw = e.target.value.trim().replace(',', '.');
          // Empty means "not granted" — the same as zero. Without this the field
          // could not be cleared at all and the level kept paying the old value.
          if (raw === '') return onCommit(null);

          const parsed = Number.parseFloat(raw);
          if (!Number.isFinite(parsed) || parsed < 0) {
            return onInvalid(label);
          }
          const stored = Math.round(parsed * scale);
          if (max !== undefined && stored > max) {
            return onInvalid(label);
          }
          onCommit(stored || null);
        }}
        className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-dark-100 disabled:opacity-40"
      />
    </label>
  );
}

function TariffSelect({
  label,
  value,
  options,
  disabled,
  noneLabel,
  onChange,
}: {
  label: string;
  value: number | null;
  options: { id: number; name: string }[];
  disabled?: boolean;
  noneLabel: string;
  onChange: (tariffId: number | null) => void;
}) {
  return (
    <label className="mt-2 block">
      <span className="mb-1 block text-xs text-dark-500">{label}</span>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-dark-100 disabled:opacity-40"
      >
        <option value="">{noneLabel}</option>
        {options.map((tariff) => (
          <option key={tariff.id} value={tariff.id}>
            {tariff.name}
          </option>
        ))}
      </select>
    </label>
  );
}
