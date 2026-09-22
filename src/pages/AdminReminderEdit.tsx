import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { PermissionGate } from '@/components/auth/PermissionGate';
import {
  adminRemindersApi,
  type AuthCondition,
  type ReminderButtonKind,
  type ReminderChannels,
  type ReminderPayload,
  type ReminderText,
  type SubscriptionSegment,
} from '@/api/adminReminders';

const LANGS = ['ru', 'en', 'ua', 'zh', 'fa'] as const;
const CABINET_PRESETS = ['/profile/accounts', '/subscriptions', '/balance'];
const inputClass =
  'w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-50';

function toInt(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export default function AdminReminderEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const editId = id ? Number(id) : null;

  const [name, setName] = useState('');
  const [channels, setChannels] = useState<ReminderChannels>('both');
  const [category, setCategory] = useState<'service' | 'marketing'>('service');
  const [auth, setAuth] = useState<AuthCondition | ''>('');
  const [segment, setSegment] = useState<SubscriptionSegment | ''>('');
  const [segmentDays, setSegmentDays] = useState('3');
  const [tariffId, setTariffId] = useState('');
  const [registeredDays, setRegisteredDays] = useState('');
  const [inactiveDays, setInactiveDays] = useState('');
  const [repeatEvery, setRepeatEvery] = useState('7');
  const [maxSends, setMaxSends] = useState('1');
  const [lang, setLang] = useState<(typeof LANGS)[number]>('ru');
  const [texts, setTexts] = useState<Record<string, ReminderText>>({
    ru: { title: '', body: '', button: '' },
  });
  const [buttonKind, setButtonKind] = useState<ReminderButtonKind>('none');
  const [buttonTarget, setButtonTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: ['admin-reminder', editId],
    queryFn: () => adminRemindersApi.get(editId as number),
    enabled: editId !== null,
  });

  useEffect(() => {
    const r = existing.data;
    if (!r) return;
    setName(r.name);
    setChannels(r.channels);
    setCategory(r.category);
    setAuth(r.conditions.auth ?? '');
    setSegment(r.conditions.subscription?.segment ?? '');
    setSegmentDays(String(r.conditions.subscription?.days ?? 3));
    setTariffId(String(r.conditions.subscription?.tariff_id ?? ''));
    setRegisteredDays(
      r.conditions.registered_days_min != null ? String(r.conditions.registered_days_min) : '',
    );
    setInactiveDays(
      r.conditions.inactive_days_min != null ? String(r.conditions.inactive_days_min) : '',
    );
    setRepeatEvery(String(r.repeat_every_days));
    setMaxSends(String(r.max_sends));
    setTexts(r.texts);
    setButtonKind(r.button_kind);
    setButtonTarget(r.button_target ?? '');
  }, [existing.data]);

  const conditions = useMemo(() => {
    const result: ReminderPayload['conditions'] = {};
    if (auth) result.auth = auth;
    if (segment) {
      result.subscription = { segment };
      if (segment === 'expiring') result.subscription.days = toInt(segmentDays) ?? 3;
      if (segment === 'tariff') result.subscription.tariff_id = toInt(tariffId);
    }
    const reg = toInt(registeredDays);
    if (reg !== null) result.registered_days_min = reg;
    const inactive = toInt(inactiveDays);
    if (inactive !== null) result.inactive_days_min = inactive;
    return result;
  }, [auth, segment, segmentDays, tariffId, registeredDays, inactiveDays]);

  // Тариф выбран, но ID не введён (или невалиден) — условие ещё не готово:
  // ни счётчик аудитории, ни сохранение не должны уходить в бэкенд с tariff_id: null.
  const tariffMissing =
    segment === 'tariff' && (toInt(tariffId) === null || (toInt(tariffId) as number) <= 0);

  // Счётчик аудитории — с дебаунсом, чтобы не дёргать бэкенд на каждый символ.
  const [debounced, setDebounced] = useState({ conditions, channels });
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced({ conditions, channels }), 400);
    return () => window.clearTimeout(timer);
  }, [conditions, channels]);
  const audience = useQuery({
    queryKey: ['admin-reminder-audience', debounced],
    queryFn: () => adminRemindersApi.audience(debounced),
    retry: false,
    enabled: !tariffMissing,
  });

  const payload = (): ReminderPayload => {
    const cleaned: Record<string, ReminderText> = {};
    for (const [code, text] of Object.entries(texts)) {
      if (!text.title.trim() && !text.body.trim()) continue;
      cleaned[code] = {
        title: text.title.trim(),
        body: text.body.trim(),
        ...(buttonKind !== 'none' && text.button?.trim() ? { button: text.button.trim() } : {}),
      };
    }
    return {
      name: name.trim(),
      channels,
      category,
      conditions,
      repeat_every_days: toInt(repeatEvery) ?? 7,
      max_sends: toInt(maxSends) ?? 1,
      texts: cleaned,
      button_kind: buttonKind,
      button_target: buttonKind === 'none' ? null : buttonTarget.trim(),
    };
  };

  const save = useMutation({
    mutationFn: (p: ReminderPayload) =>
      editId !== null ? adminRemindersApi.update(editId, p) : adminRemindersApi.create(p),
    onSuccess: () => navigate('/admin/reminders'),
    onError: () => setError('admin.reminders.form.saveFailed'),
  });

  const test = useMutation({
    mutationFn: () => adminRemindersApi.test(editId as number),
    onMutate: () => setTestError(null),
    onError: (err: unknown) => {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      if (status === 400) setTestError('admin.reminders.form.testNoTelegram');
      else if (status === 422) setTestError('admin.reminders.form.testInvalidTexts');
      else setTestError('admin.reminders.form.testFailed');
    },
  });

  const submit = () => {
    if (tariffMissing) {
      setError('admin.reminders.form.tariffRequired');
      return;
    }
    const p = payload();
    if (!p.texts.ru?.title || !p.texts.ru?.body) {
      setError('admin.reminders.form.ruRequired');
      return;
    }
    setError(null);
    save.mutate(p);
  };

  const current = texts[lang] ?? { title: '', body: '', button: '' };
  const setText = (field: keyof ReminderText, value: string) =>
    setTexts((prev) => ({ ...prev, [lang]: { ...current, [field]: value } }));
  const preview = {
    ...texts.ru,
    ...Object.fromEntries(Object.entries(current).filter(([, v]) => v)),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-dark-50">
        {t(editId !== null ? 'admin.reminders.editTitle' : 'admin.reminders.createTitle')}
      </h1>

      <section className="space-y-3">
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.name')}
          <input
            aria-label={t('admin.reminders.form.name')}
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </label>
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.channels')}
          <select
            aria-label={t('admin.reminders.form.channels')}
            className={inputClass}
            value={channels}
            onChange={(e) => setChannels(e.target.value as ReminderChannels)}
          >
            <option value="both">{t('admin.reminders.channels.both')}</option>
            <option value="bot">{t('admin.reminders.channels.bot')}</option>
            <option value="cabinet">{t('admin.reminders.channels.cabinet')}</option>
          </select>
        </label>
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.category')}
          <select
            aria-label={t('admin.reminders.form.category')}
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as 'service' | 'marketing')}
          >
            <option value="service">{t('admin.reminders.category.service')}</option>
            <option value="marketing">{t('admin.reminders.category.marketing')}</option>
          </select>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-dark-100">{t('admin.reminders.form.conditions')}</h2>
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.auth')}
          <select
            aria-label={t('admin.reminders.form.auth')}
            className={inputClass}
            value={auth}
            onChange={(e) => setAuth(e.target.value as AuthCondition | '')}
          >
            <option value="">{t('admin.reminders.any')}</option>
            <option value="single_method">{t('admin.reminders.auth.single_method')}</option>
            <option value="telegram_only">{t('admin.reminders.auth.telegram_only')}</option>
            <option value="email_only">{t('admin.reminders.auth.email_only')}</option>
          </select>
        </label>
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.segment')}
          <select
            aria-label={t('admin.reminders.form.segment')}
            className={inputClass}
            value={segment}
            onChange={(e) => setSegment(e.target.value as SubscriptionSegment | '')}
          >
            <option value="">{t('admin.reminders.any')}</option>
            {(
              ['active', 'trial', 'expiring', 'expired', 'none', 'low_balance', 'tariff'] as const
            ).map((s) => (
              <option key={s} value={s}>
                {t(`admin.reminders.segment.${s}`)}
              </option>
            ))}
          </select>
        </label>
        {segment === 'expiring' && (
          <label className="block text-sm text-dark-300">
            {t('admin.reminders.form.segmentDays')}
            <input
              aria-label={t('admin.reminders.form.segmentDays')}
              type="number"
              min={1}
              max={365}
              className={inputClass}
              value={segmentDays}
              onChange={(e) => setSegmentDays(e.target.value)}
            />
          </label>
        )}
        {segment === 'tariff' && (
          <label className="block text-sm text-dark-300">
            {t('admin.reminders.form.tariffId')}
            <input
              aria-label={t('admin.reminders.form.tariffId')}
              type="number"
              min={1}
              className={inputClass}
              value={tariffId}
              onChange={(e) => setTariffId(e.target.value)}
            />
          </label>
        )}
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.registeredDays')}
          <input
            aria-label={t('admin.reminders.form.registeredDays')}
            type="number"
            min={0}
            max={3650}
            className={inputClass}
            value={registeredDays}
            onChange={(e) => setRegisteredDays(e.target.value)}
          />
        </label>
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.inactiveDays')}
          <input
            aria-label={t('admin.reminders.form.inactiveDays')}
            type="number"
            min={0}
            max={3650}
            className={inputClass}
            value={inactiveDays}
            onChange={(e) => setInactiveDays(e.target.value)}
          />
        </label>
        <p className="text-sm text-dark-300">
          {t('admin.reminders.form.audience')}:{' '}
          {audience.data?.bot != null && <span>🤖 {audience.data.bot} </span>}
          {audience.data?.cabinet != null && <span>🖥 {audience.data.cabinet}</span>}
        </p>
      </section>

      {channels !== 'cabinet' && (
        <section className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-dark-300">
            {t('admin.reminders.form.repeatEvery')}
            <input
              aria-label={t('admin.reminders.form.repeatEvery')}
              type="number"
              min={1}
              max={365}
              className={inputClass}
              value={repeatEvery}
              onChange={(e) => setRepeatEvery(e.target.value)}
            />
          </label>
          <label className="block text-sm text-dark-300">
            {t('admin.reminders.form.maxSends')}
            <input
              aria-label={t('admin.reminders.form.maxSends')}
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={maxSends}
              onChange={(e) => setMaxSends(e.target.value)}
            />
          </label>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`rounded-lg px-3 py-1 text-sm ${lang === code ? 'bg-accent-500 text-white' : 'bg-dark-800 text-dark-300'}`}
            >
              {code.toUpperCase()}
              {code === 'ru' ? ' *' : ''}
            </button>
          ))}
        </div>
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.title')}
          <input
            aria-label={t('admin.reminders.form.title')}
            className={inputClass}
            maxLength={80}
            value={current.title}
            onChange={(e) => setText('title', e.target.value)}
          />
        </label>
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.body')}
          <textarea
            aria-label={t('admin.reminders.form.body')}
            className={inputClass}
            rows={4}
            maxLength={1000}
            value={current.body}
            onChange={(e) => setText('body', e.target.value)}
          />
        </label>
        <label className="block text-sm text-dark-300">
          {t('admin.reminders.form.buttonKind')}
          <select
            aria-label={t('admin.reminders.form.buttonKind')}
            className={inputClass}
            value={buttonKind}
            onChange={(e) => setButtonKind(e.target.value as ReminderButtonKind)}
          >
            <option value="none">{t('admin.reminders.button.none')}</option>
            <option value="cabinet">{t('admin.reminders.button.cabinet')}</option>
            <option value="url">{t('admin.reminders.button.url')}</option>
          </select>
        </label>
        {buttonKind !== 'none' && (
          <>
            <label className="block text-sm text-dark-300">
              {t('admin.reminders.form.buttonTarget')}
              <input
                aria-label={t('admin.reminders.form.buttonTarget')}
                className={inputClass}
                maxLength={500}
                list={buttonKind === 'cabinet' ? 'reminder-cabinet-presets' : undefined}
                placeholder={buttonKind === 'cabinet' ? '/profile/accounts' : 'https://'}
                value={buttonTarget}
                onChange={(e) => setButtonTarget(e.target.value)}
              />
              <datalist id="reminder-cabinet-presets">
                {CABINET_PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm text-dark-300">
              {t('admin.reminders.form.buttonText')}
              <input
                aria-label={t('admin.reminders.form.buttonText')}
                className={inputClass}
                maxLength={40}
                value={current.button ?? ''}
                onChange={(e) => setText('button', e.target.value)}
              />
            </label>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-4">
        <div className="text-xs text-dark-400">{t('admin.reminders.form.preview')}</div>
        <div className="mt-1 font-semibold text-dark-50">{preview.title}</div>
        <div className="whitespace-pre-line text-sm text-dark-300">{preview.body}</div>
      </section>

      {error && <p className="text-sm text-error-400">{t(error)}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={save.isPending}
          className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-white"
        >
          {t('admin.reminders.form.save')}
        </button>
        {editId !== null && (
          <PermissionGate permission="user_reminders:edit">
            <button
              type="button"
              onClick={() => test.mutate()}
              disabled={test.isPending}
              className="rounded-xl bg-dark-700 px-4 py-2 text-sm text-dark-100"
            >
              {t('admin.reminders.form.sendTest')}
            </button>
          </PermissionGate>
        )}
        {test.isSuccess && (
          <span className="text-sm text-success-400">{t('admin.reminders.form.testSent')}</span>
        )}
        {test.isError && testError && (
          <span className="text-sm text-error-400">{t(testError)}</span>
        )}
      </div>
    </div>
  );
}
