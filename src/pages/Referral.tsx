import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { referralApi, type ReferralEarning } from '../api/referral';
import type { ReferralDaysTargetOption, ReferralTerms } from '../types';
import { usePlatform } from '../platform';
import { copyToClipboard } from '../utils/clipboard';
import { brandingApi } from '../api/branding';
import { partnerApi } from '../api/partners';
import { withdrawalApi } from '../api/withdrawals';
import { CampaignCard } from '../components/partner/CampaignCard';
import { useCurrency } from '../hooks/useCurrency';
import { StatCard } from '@/components/stats';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanknotesIcon,
  CardIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  ExclamationIcon,
  GiftIcon,
  LinkIcon,
  PartnerIcon,
  PercentIcon,
  ShareIcon,
  TelegramIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/icons';

function getWithdrawalStatusBadge(status: string): string {
  switch (status) {
    case 'completed':
      return 'badge-success';
    case 'approved':
      return 'badge-info';
    case 'pending':
      return 'badge-warning';
    case 'rejected':
    case 'cancelled':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
}

/**
 * The rank line under the programme terms, or null when there is nothing to say.
 *
 * Three states, and only two of them produce text: no rank reached yet, and a
 * rank with a next step ahead. A partner standing on the TOP rank has no next
 * step — rendering an empty paragraph for them left a stray margin on the one
 * screen that should read as "you are done climbing".
 *
 * Under `chain` there are no ranks at all, so nothing is shown: the server sends
 * tier_current_level = null there, and a naive check would tell every single user
 * "no rank reached yet" about a concept that does not exist in their programme.
 *
 * Exported for tests: the decision is worth checking on its own, without
 * mounting the whole page.
 */
/**
 * Programme terms under the `levels` scheme.
 *
 * Exported so the card can be tested on its own: mounting the whole Referral page
 * needs a dozen mocks, and the part worth checking is this one — whether the card
 * states which mode is in force and marks the level the viewer is actually on.
 */
/**
 * What the user chose: the form of the reward and where the days land.
 *
 * Rendered only for the parts an administrator allowed — a control that changes
 * nothing promises an influence it does not have. Each option shows whether it is
 * the one in force, because a settings screen that does not say what is selected
 * makes people guess.
 *
 * Exported for tests: mounting the whole page needs a dozen mocks, and the part
 * worth checking is this one.
 */
export function RewardSettings({
  terms,
  onChange,
  pending = false,
}: {
  terms: ReferralTerms;
  onChange: (payload: {
    reward_preference?: string | null;
    days_target_subscription_id?: number | null;
    set_reward_preference?: boolean;
    set_days_target?: boolean;
  }) => void;
  pending?: boolean;
}) {
  const { t } = useTranslation();
  const kindChoice = terms.allow_reward_kind_choice === true;
  const targetChoice = terms.allow_days_target_choice === true;
  if (!kindChoice && !targetChoice) return null;

  const options = terms.days_target_options ?? [];
  const kinds: { value: string | null; label: string }[] = [
    { value: null, label: t('referral.rewardSettings.kindBoth') },
    { value: 'money', label: t('referral.rewardSettings.kindMoney') },
    { value: 'days', label: t('referral.rewardSettings.kindDays') },
  ];

  const optionLabel = (option: ReferralDaysTargetOption) => {
    const name = option.tariff_name || t('referral.rewardSettings.subscription');
    if (!option.end_date) return name;
    const until = t('referral.rewardSettings.until', {
      date: new Date(option.end_date).toLocaleDateString(),
    });
    return `${name} — ${until}`;
  };

  const choice = (key: string, selected: boolean, label: string, onSelect: () => void) => (
    <button
      key={key}
      type="button"
      disabled={pending}
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors disabled:opacity-60 ${
        selected
          ? 'border-accent-500/40 bg-accent-500/10 text-dark-100'
          : 'border-dark-700/40 bg-dark-800/30 text-dark-200 hover:border-dark-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? 'border-accent-400' : 'border-dark-600'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-accent-400" />}
      </span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bento-card">
      <h2 className="text-lg font-semibold text-dark-100">{t('referral.rewardSettings.title')}</h2>
      <p className="mt-1 text-sm text-dark-400">{t('referral.rewardSettings.intro')}</p>

      {kindChoice && (
        <section className="mt-4">
          <h3 className="text-sm font-medium text-dark-200">
            {t('referral.rewardSettings.kindHeader')}
          </h3>
          <p className="mt-1 text-xs text-dark-500">{t('referral.rewardSettings.kindHint')}</p>
          <div className="mt-2 space-y-2">
            {kinds.map((kind) =>
              choice(
                kind.value ?? 'any',
                (terms.reward_preference ?? null) === kind.value,
                kind.label,
                () => onChange({ reward_preference: kind.value, set_reward_preference: true }),
              ),
            )}
          </div>
        </section>
      )}

      {targetChoice && (
        <section className="mt-5">
          <h3 className="text-sm font-medium text-dark-200">
            {t('referral.rewardSettings.targetHeader')}
          </h3>
          <p className="mt-1 text-xs text-dark-500">{t('referral.rewardSettings.targetHint')}</p>
          {options.length === 0 ? (
            <p className="mt-2 text-sm text-dark-400">{t('referral.rewardSettings.targetNone')}</p>
          ) : (
            <div className="mt-2 space-y-2">
              {/* Автоподбор — тоже вариант, и он обязан быть виден как выбранный:
                  иначе непонятно, что происходит сейчас. */}
              {choice(
                'auto',
                (terms.days_target_subscription_id ?? null) === null,
                t('referral.rewardSettings.targetAuto'),
                () => onChange({ days_target_subscription_id: null, set_days_target: true }),
              )}
              {options.map((option) =>
                choice(
                  String(option.id),
                  terms.days_target_subscription_id === option.id,
                  optionLabel(option),
                  () => onChange({ days_target_subscription_id: option.id, set_days_target: true }),
                ),
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function ProgrammeTerms({ terms }: { terms: ReferralTerms }) {
  const { t } = useTranslation();
  const isTiers = terms.levels_mode === 'tiers';
  const levels = terms.levels ?? [];
  // Строки-описания остаются запасным путём: они приходят из того же источника
  // и покрывают старый сервер, который ещё не отдаёт разбор по частям.
  const fallbackLines = terms.level_descriptions ?? [];
  const progress = tierProgressText(terms, t);

  return (
    <div className="bento-card">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-dark-100">{t('referral.terms.title')}</h2>
        {/* Правило режима — одной фразой над лестницей. Без неё список
              уровней в режиме «за приглашённых» читается как складывающиеся
              награды, а в цепочке — наоборот, как выбор одной из них. */}
        <p className="mt-1 text-sm text-dark-400">
          {isTiers ? t('referral.terms.modeTiers') : t('referral.terms.modeChain')}
        </p>
      </div>

      {levels.length > 0 ? (
        <ol className="space-y-2">
          {levels.map((lvl) => (
            <li
              key={lvl.level}
              className={`rounded-xl border p-3 transition-colors ${
                lvl.is_current
                  ? 'border-accent-500/40 bg-accent-500/10'
                  : 'border-dark-700/40 bg-dark-800/30'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-sm font-semibold ${
                    lvl.is_current ? 'bg-accent-500 text-dark-900' : 'bg-dark-700 text-dark-200'
                  }`}
                >
                  {lvl.level}
                </span>
                <span className="text-sm font-medium text-dark-100">
                  {t('referral.terms.levelLabel', { level: lvl.level })}
                </span>
                {lvl.is_current && (
                  <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-xs text-accent-300">
                    {t('referral.terms.currentBadge')}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {lvl.pays_referrer ? (
                  lvl.rewards.map((reward) => (
                    <span
                      key={reward}
                      className="rounded-lg bg-success-500/15 px-2 py-1 text-sm text-success-300"
                    >
                      {reward}
                    </span>
                  ))
                ) : (
                  <span className="rounded-lg bg-dark-700/60 px-2 py-1 text-sm text-dark-400">
                    {t('referral.terms.paysNothing')}
                  </span>
                )}
                {lvl.pays_referrer && lvl.trigger_label && (
                  <span className="text-xs text-dark-400">{lvl.trigger_label}</span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-dark-400">
                {/* Условие показывается только там, где оно есть смысл: в
                      цепочке уровень открывается порогом, а в режиме за
                      приглашённых порог и определяет, какой уровень ваш. */}
                <span>
                  {lvl.required_referrals > 0
                    ? lvl.required_referrals_active_only
                      ? t('referral.terms.fromActive', { count: lvl.required_referrals })
                      : t('referral.terms.fromAny', { count: lvl.required_referrals })
                    : t('referral.terms.startingLevel')}
                </span>
                {lvl.referee_reward && (
                  <span>{t('referral.terms.refereeGets', { reward: lvl.referee_reward })}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : fallbackLines.length > 0 ? (
        <ul className="space-y-2">
          {fallbackLines.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-dark-200">
              <span aria-hidden="true" className="mt-1 text-accent-400">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-dark-400">{t('referral.terms.noLevels')}</p>
      )}

      {terms.personal_percent != null && (
        <p className="mt-4 rounded-xl border border-warning-500/25 bg-warning-500/10 p-3 text-sm text-warning-300">
          {t('referral.terms.personalRate', { percent: terms.personal_percent })}
        </p>
      )}

      {progress && <p className="mt-4 text-sm text-dark-300">{progress}</p>}
    </div>
  );
}

export function tierProgressText(
  terms: Pick<
    ReferralTerms,
    'levels_mode' | 'tier_current_level' | 'tier_next_level' | 'tier_next_remaining'
  >,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (terms.levels_mode !== 'tiers') return null;
  if (terms.tier_current_level == null) return t('referral.terms.tierNone');
  if (terms.tier_next_level == null) return null;
  return t('referral.terms.tierNext', {
    level: terms.tier_next_level,
    count: terms.tier_next_remaining ?? 0,
  });
}

export default function Referral() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { formatAmount, currencySymbol, formatPositive, formatWithCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState<'cabinet' | 'bot' | null>(null);
  const [rewardChoiceError, setRewardChoiceError] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const { data: info, isLoading } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  });

  // Build referral link for cabinet registration
  const referralLink = info?.referral_code
    ? `${window.location.origin}/login?ref=${info.referral_code}`
    : '';
  const botReferralLink = info?.bot_referral_link || '';

  const rewardChoiceMutation = useMutation({
    mutationFn: referralApi.updateRewardChoice,
    // Ответ эндпоинта — те же условия целиком, поэтому кладём их в кэш сразу:
    // повторный запрос показал бы прежний выбор на долю секунды.
    onSuccess: (updated) => queryClient.setQueryData(['referral-terms'], updated),
    onError: () => setRewardChoiceError(t('referral.rewardSettings.saveError')),
  });

  const { data: terms } = useQuery({
    queryKey: ['referral-terms'],
    queryFn: referralApi.getReferralTerms,
  });

  const { data: referralList } = useQuery({
    queryKey: ['referral-list'],
    queryFn: () => referralApi.getReferralList({ per_page: 10 }),
  });

  const { data: earnings } = useQuery({
    queryKey: ['referral-earnings'],
    queryFn: () => referralApi.getReferralEarnings({ per_page: 10 }),
  });

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  });

  // Partner status query
  const { data: partnerStatus } = useQuery({
    queryKey: ['partner-status'],
    queryFn: partnerApi.getStatus,
  });

  const isPartner = partnerStatus?.partner_status === 'approved';

  // Withdrawal is available to any referrer: the backend endpoints
  // (/cabinet/referral/withdrawal/*) do not require partner_status, so the
  // section is gated only by the admin visibility flag.
  const withdrawalVisible = terms?.partner_section_visible !== false;

  const { data: withdrawalBalance } = useQuery({
    queryKey: ['withdrawal-balance'],
    queryFn: withdrawalApi.getBalance,
    enabled: withdrawalVisible,
  });

  const { data: withdrawalHistory } = useQuery({
    queryKey: ['withdrawal-history'],
    queryFn: withdrawalApi.getHistory,
    enabled: withdrawalVisible,
  });

  // Withdrawal cancel mutation
  const cancelWithdrawalMutation = useMutation({
    mutationFn: withdrawalApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-balance'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] });
    },
  });

  const isLevelsScheme = terms?.scheme === 'levels';
  const isTiersScheme = isLevelsScheme && terms?.levels_mode === 'tiers';

  /**
   * A reward can be money, subscription days, or both. Days carry
   * amount_kopeks = 0 by design, so formatting by the money amount alone renders
   * a real "+7 days" reward as "+0.00 ₽". Zero money is omitted next to days for
   * the same reason it is on the bot side: it reports the absence of something
   * this programme never promised.
   */
  const formatEarning = useCallback(
    (earning: ReferralEarning) => {
      const days = earning.days_granted ?? 0;
      const money = earning.amount_rubles ?? 0;
      const daysLabel = days
        ? earning.tariff_name
          ? t('referral.daysWithTariff', { count: days, tariff: earning.tariff_name })
          : t('referral.days', { count: days })
        : '';

      if (days && !money) return `+${daysLabel}`;
      if (days) return `${formatPositive(money)} + ${daysLabel}`;
      return formatPositive(money);
    },
    [formatPositive, t],
  );

  const programTerms = useMemo(() => {
    if (!terms) return null;

    // Под схемой `levels` плоские поля ниже не управляют ни одним начислением:
    // выплаты идут по таблице уровней. Показывать их как «условия программы»
    // значило бы обещать пользователю то, чего бот не платит.
    if (terms.scheme === 'levels') {
      return <ProgrammeTerms terms={terms} />;
    }

    const showNewUserBonus = terms.first_topup_bonus_kopeks > 0;
    const showInviterBonus = terms.inviter_bonus_kopeks > 0;
    const cardCount = 2 + (showNewUserBonus ? 1 : 0) + (showInviterBonus ? 1 : 0);
    const gridColsMap: Record<number, string> = {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
    };
    const gridCols = gridColsMap[cardCount] ?? 'md:grid-cols-4';

    return (
      <div className="bento-card">
        <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('referral.terms.title')}</h2>
        <div className={`grid grid-cols-2 gap-4 ${gridCols}`}>
          <StatCard
            label={t('referral.terms.commission')}
            value={`${terms.commission_percent}%`}
            icon={<PercentIcon className="h-5 w-5" />}
            tone="neutral"
          />
          <StatCard
            label={t('referral.terms.minTopup')}
            value={`${formatAmount(terms.minimum_topup_rubles)} ${currencySymbol}`}
            icon={<BanknotesIcon className="h-5 w-5" />}
            tone="neutral"
          />
          {showNewUserBonus && (
            <StatCard
              label={t('referral.terms.newUserBonus')}
              value={formatPositive(terms.first_topup_bonus_rubles)}
              icon={<GiftIcon className="h-5 w-5" />}
              tone="success"
            />
          )}
          {showInviterBonus && (
            <StatCard
              label={t('referral.terms.inviterBonus')}
              value={formatPositive(terms.inviter_bonus_rubles)}
              icon={<UserPlusIcon className="h-5 w-5" />}
              tone="success"
            />
          )}
        </div>
      </div>
    );
  }, [terms, t, formatAmount, formatPositive, currencySymbol]);

  const copyLink = async (link: string, type: 'cabinet' | 'bot') => {
    if (!link) return;
    try {
      await copyToClipboard(link);
      setCopiedLink(type);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // clipboard write failed silently
    }
  };

  const { openTelegramLink } = usePlatform();

  const shareLink = () => {
    if (!referralLink) return;
    // Under the levels scheme commission_percent governs nothing — payouts come
    // from the level table — so the invite must not name a rate. This text is what
    // the user forwards to a friend; a wrong number here is a promise made in their
    // name. The bot's own invite was fixed the same way.
    const botName = branding?.name || import.meta.env.VITE_APP_NAME || 'Cabinet';
    const shareText = isLevelsScheme
      ? terms?.referee_bonus_description
        ? t('referral.shareMessageBonus', { bonus: terms.referee_bonus_description, botName })
        : t('referral.shareMessagePlain', { botName })
      : t('referral.shareMessage', { percent: info?.commission_percent || 0, botName });

    if (navigator.share) {
      navigator
        .share({
          title: t('referral.title'),
          text: shareText,
          url: referralLink,
        })
        .catch(() => {});
      return;
    }

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      referralLink,
    )}&text=${encodeURIComponent(shareText)}`;
    openTelegramLink(telegramUrl);
  };

  if (isLoading) {
    return (
      <PageSkeleton titleWidth="w-40">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <div className="col-span-2 md:col-span-1">
            <StatCard loading />
          </div>
          <StatCard loading />
          <StatCard loading />
        </div>
        <Skeleton variant="card" className="h-48" />
      </PageSkeleton>
    );
  }

  // Show disabled state if referral program is disabled
  if (terms && !terms.is_enabled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-dark-800">
          <UsersIcon className="h-12 w-12 text-dark-500" />
        </div>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-dark-100">{t('referral.title')}</h1>
          <p className="text-dark-400">{t('referral.disabled')}</p>
        </div>
      </div>
    );
  }

  const partnerStatusValue = partnerStatus?.partner_status ?? 'none';
  const showApplySection = partnerStatusValue === 'none';
  const showPendingSection = partnerStatusValue === 'pending';
  const showApprovedSection = partnerStatusValue === 'approved';
  const showRejectedSection = partnerStatusValue === 'rejected';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('referral.title')}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div className="col-span-2 md:col-span-1">
          <StatCard
            label={t('referral.stats.totalReferrals')}
            value={info?.total_referrals || 0}
            icon={<UsersIcon className="h-5 w-5" />}
            tone="neutral"
            subValue={`${info?.active_referrals || 0} ${t('referral.stats.activeReferrals').toLowerCase()}`}
          />
        </div>
        <StatCard
          label={t('referral.stats.totalEarnings')}
          value={formatPositive(info?.total_earnings_rubles || 0)}
          icon={<BanknotesIcon className="h-5 w-5" />}
          tone="success"
          subValue={
            info?.total_earnings_days
              ? t('referral.stats.earnedDays', { count: info.total_earnings_days })
              : undefined
          }
        />
        <StatCard
          label={
            // В режиме «за приглашённых» глубины сети не существует — цепочка не
            // обходится вовсе. Показывать её там значит обещать выплаты за
            // приглашённых чужими приглашёнными, которых в этом режиме не бывает.
            isTiersScheme
              ? t('referral.stats.yourLevel')
              : isLevelsScheme
                ? t('referral.stats.chainDepth')
                : t('referral.stats.commissionRate')
          }
          value={
            isTiersScheme
              ? (terms?.tier_current_level ?? null) === null
                ? t('referral.stats.levelNotReached')
                : String(terms?.tier_current_level)
              : isLevelsScheme
                ? t('referral.stats.levelsValue', { count: terms?.max_level_depth || 1 })
                : `${info?.commission_percent || 0}%`
          }
          icon={<PercentIcon className="h-5 w-5" />}
          tone="accent"
        />
      </div>

      {/* Referral Links */}
      <div className="bento-card">
        <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('referral.yourLink')}</h2>
        <div className="space-y-3">
          {/* Bot link */}
          {botReferralLink && (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-dark-300">
                <TelegramIcon className="h-4 w-4 text-accent-400" />
                {t('referral.botLink')}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={botReferralLink}
                  className="input flex-1 text-sm"
                />
                <button
                  onClick={() => copyLink(botReferralLink, 'bot')}
                  className={`btn-primary shrink-0 px-4 ${
                    copiedLink === 'bot' ? 'bg-success-500 hover:bg-success-500' : ''
                  }`}
                >
                  {copiedLink === 'bot' ? <CheckIcon /> : <CopyIcon />}
                  <span className="ml-2">
                    {copiedLink === 'bot' ? t('referral.copied') : t('referral.copyLink')}
                  </span>
                </button>
              </div>
            </div>
          )}
          {/* Cabinet link */}
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-dark-300">
              <LinkIcon className="h-4 w-4 text-accent-400" />
              {t('referral.cabinetLink')}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="text" readOnly value={referralLink} className="input flex-1 text-sm" />
              <div className="flex gap-2">
                <button
                  onClick={() => copyLink(referralLink, 'cabinet')}
                  disabled={!referralLink}
                  className={`btn-primary shrink-0 px-4 ${
                    copiedLink === 'cabinet' ? 'bg-success-500 hover:bg-success-500' : ''
                  } ${!referralLink ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {copiedLink === 'cabinet' ? <CheckIcon /> : <CopyIcon />}
                  <span className="ml-2">
                    {copiedLink === 'cabinet' ? t('referral.copied') : t('referral.copyLink')}
                  </span>
                </button>
                <button
                  onClick={shareLink}
                  disabled={!referralLink}
                  className={`btn-secondary flex shrink-0 items-center px-4 ${
                    !referralLink ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <ShareIcon className="h-4 w-4" />
                  <span className="ml-2">{t('referral.shareButton')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-dark-500">
          {isLevelsScheme
            ? t('referral.shareHintLevels')
            : t('referral.shareHint', { percent: info?.commission_percent || 0 })}
        </p>
      </div>

      {/* Program Terms */}
      {programTerms}

      {/* Reward Settings */}
      {terms && (
        <div className="mt-6">
          <RewardSettings
            terms={terms}
            pending={rewardChoiceMutation.isPending}
            onChange={(payload) => {
              setRewardChoiceError(null);
              rewardChoiceMutation.mutate(payload);
            }}
          />
          {/* Ошибка сохранения обязана быть видна: без неё нажатие выглядит
              принятым, а выбор остаётся прежним. */}
          {rewardChoiceError && (
            <p className="mt-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
              {rewardChoiceError}
            </p>
          )}
        </div>
      )}

      {/* Referrals List */}
      <div className="bento-card">
        <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('referral.yourReferrals')}</h2>
        {referralList?.items && referralList.items.length > 0 ? (
          <div className="space-y-3">
            {referralList.items.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between rounded-xl border border-dark-700/30 bg-dark-800/30 p-3"
              >
                <div>
                  <div className="font-medium text-dark-100">
                    {ref.first_name || ref.username || t('referral.anonymousUser', { id: ref.id })}
                  </div>
                  <div className="mt-0.5 text-xs text-dark-500">
                    {new Date(ref.created_at).toLocaleDateString(i18n.language)}
                  </div>
                </div>
                {ref.has_paid ? (
                  <span className="badge-success">{t('referral.status.paid')}</span>
                ) : (
                  <span className="badge-neutral">{t('referral.status.pending')}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
              <UsersIcon className="h-8 w-8 text-dark-500" />
            </div>
            <div className="text-dark-400">{t('referral.noReferrals')}</div>
          </div>
        )}
      </div>

      {/* Earnings History */}
      {earnings?.items && earnings.items.length > 0 && (
        <div className="bento-card">
          <h2 className="mb-4 text-lg font-semibold text-dark-100">
            {t('referral.earningsHistory')}
          </h2>
          <div className="space-y-3">
            {earnings.items.map((earning) => (
              <div
                key={earning.id}
                className="flex items-center justify-between rounded-xl border border-dark-700/30 bg-dark-800/30 p-3"
              >
                <div>
                  <div className="text-dark-100">
                    {earning.referral_first_name ||
                      earning.referral_username ||
                      t('referral.anonymousReferral')}
                  </div>
                  <div className="mt-0.5 text-xs text-dark-500">
                    {t(`referral.reasons.${earning.reason}`, earning.reason)}
                    {(earning.level ?? 1) > 1 &&
                      ` • ${t('referral.levelBadge', { count: earning.level ?? 1 })}`}{' '}
                    • {new Date(earning.created_at).toLocaleDateString(i18n.language)}
                  </div>
                </div>
                <div className="font-semibold text-success-400">{formatEarning(earning)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== Partner Application Section ==================== */}

      {/* Status: none — Become a Partner CTA */}
      {terms?.partner_section_visible !== false && showApplySection && (
        <div className="bento-card">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-400">
              <PartnerIcon className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-dark-100">
                {t('referral.partner.becomePartner')}
              </h2>
              <p className="mt-1 text-sm text-dark-400">
                {t('referral.partner.becomePartnerDesc')}
              </p>
              <button
                onClick={() => navigate('/referral/partner/apply')}
                className="btn-primary mt-4 px-6"
              >
                {t('referral.partner.applyButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status: pending — Application Under Review */}
      {terms?.partner_section_visible !== false && showPendingSection && (
        <div className="bento-card border-warning-500/20">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning-500/10 text-warning-400">
              <ClockIcon />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-dark-100">
                {t('referral.partner.underReview')}
              </h2>
              <p className="mt-1 text-sm text-dark-400">{t('referral.partner.underReviewDesc')}</p>
              {partnerStatus?.latest_application?.created_at && (
                <p className="mt-2 text-xs text-dark-500">
                  {t('referral.partner.submittedAt', {
                    date: new Date(partnerStatus.latest_application.created_at).toLocaleDateString(
                      i18n.language,
                    ),
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status: approved — Partner Badge */}
      {terms?.partner_section_visible !== false && showApprovedSection && (
        <div className="bento-card border-success-500/20">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-success-500/10 text-success-400">
              <PartnerIcon className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-dark-100">
                  {t('referral.partner.partnerStatus')}
                </h2>
                <span className="badge-success">{t('referral.partner.active')}</span>
              </div>
              <p className="mt-1 text-sm text-dark-400">
                {t('referral.partner.commissionInfo', {
                  percent: partnerStatus?.commission_percent ?? 0,
                })}
              </p>
            </div>
            <a href="#withdrawal-section" className="btn-secondary hidden px-4 sm:flex">
              {t('referral.withdrawal.goToWithdrawal')}
            </a>
          </div>
        </div>
      )}

      {/* Status: rejected — Rejection Notice */}
      {terms?.partner_section_visible !== false && showRejectedSection && (
        <div className="bento-card border-error-500/20">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-error-500/10 text-error-400">
              <ExclamationIcon className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-dark-100">
                {t('referral.partner.rejected')}
              </h2>
              {partnerStatus?.latest_application?.admin_comment && (
                <p className="mt-1 text-sm text-dark-300">
                  {partnerStatus.latest_application.admin_comment}
                </p>
              )}
              <button
                onClick={() => navigate('/referral/partner/apply')}
                className="btn-primary mt-4 px-6"
              >
                {t('referral.partner.reapplyButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Partner Campaigns Section ==================== */}

      {terms?.partner_section_visible !== false &&
        isPartner &&
        partnerStatus?.campaigns &&
        partnerStatus.campaigns.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400">
                <LinkIcon />
              </div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('referral.partner.yourCampaigns')}
              </h2>
            </div>

            {partnerStatus.campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

      {/* ==================== Withdrawal Section ==================== */}

      {withdrawalVisible && (
        <div id="withdrawal-section" className="space-y-6">
          {/* Withdrawal Balance Card */}
          {withdrawalBalance && (
            <div className="bento-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400">
                  <WalletIcon className="h-8 w-8" />
                </div>
                <h2 className="text-lg font-semibold text-dark-100">
                  {t('referral.withdrawal.title')}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="col-span-2 md:col-span-1">
                  <StatCard
                    label={t('referral.withdrawal.available')}
                    value={formatWithCurrency(withdrawalBalance.available_total / 100)}
                    icon={<WalletIcon className="h-5 w-5" />}
                    tone="success"
                  />
                </div>
                <StatCard
                  label={t('referral.withdrawal.totalEarned')}
                  value={formatWithCurrency(withdrawalBalance.total_earned / 100)}
                  icon={<BanknotesIcon className="h-5 w-5" />}
                  tone="neutral"
                />
                <StatCard
                  label={t('referral.withdrawal.withdrawn')}
                  value={formatWithCurrency(withdrawalBalance.withdrawn / 100)}
                  icon={<ArrowUpIcon className="h-5 w-5" />}
                  tone="neutral"
                />
                <StatCard
                  label={t('referral.withdrawal.spent')}
                  value={formatWithCurrency(withdrawalBalance.referral_spent / 100)}
                  icon={<CardIcon className="h-5 w-5" />}
                  tone="neutral"
                />
                <StatCard
                  label={t('referral.withdrawal.pending')}
                  value={formatWithCurrency(withdrawalBalance.pending / 100)}
                  icon={<ArrowDownIcon className="h-5 w-5" />}
                  tone="warning"
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={() => navigate('/referral/withdrawal/request')}
                  disabled={!withdrawalBalance.can_request}
                  className={`btn-primary w-full px-6 sm:w-auto ${
                    !withdrawalBalance.can_request ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  {t('referral.withdrawal.requestButton')}
                </button>
                {!withdrawalBalance.can_request && withdrawalBalance.cannot_request_reason ? (
                  <p className="mt-2 text-xs text-dark-500">
                    {withdrawalBalance.cannot_request_reason}
                  </p>
                ) : (
                  withdrawalBalance.min_amount_kopeks > 0 && (
                    <p className="mt-2 text-xs text-dark-500">
                      {t('referral.withdrawal.minAmount', {
                        amount: formatWithCurrency(withdrawalBalance.min_amount_kopeks / 100),
                      })}
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {/* Withdrawal History */}
          <div className="bento-card">
            <h2 className="mb-4 text-lg font-semibold text-dark-100">
              {t('referral.withdrawal.history')}
            </h2>
            {withdrawalHistory?.items && withdrawalHistory.items.length > 0 ? (
              <div className="space-y-3">
                {withdrawalHistory.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-dark-700/30 bg-dark-800/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-dark-100">
                          {formatWithCurrency(item.amount_rubles)}
                        </span>
                        <span className={getWithdrawalStatusBadge(item.status)}>
                          {t(`referral.withdrawal.status.${item.status}`, item.status)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-dark-500">
                        {new Date(item.created_at).toLocaleDateString(i18n.language)}
                        {item.payment_details && (
                          <span className="ml-1">
                            &bull;{' '}
                            {item.payment_details.length > 40
                              ? `${item.payment_details.slice(0, 40)}...`
                              : item.payment_details}
                          </span>
                        )}
                      </div>
                      {item.admin_comment && (
                        <div className="mt-1 text-xs text-dark-400">{item.admin_comment}</div>
                      )}
                    </div>
                    {item.status === 'pending' && (
                      <button
                        onClick={() => cancelWithdrawalMutation.mutate(item.id)}
                        disabled={cancelWithdrawalMutation.isPending}
                        className="ml-3 shrink-0 text-sm text-error-400 transition-colors hover:text-error-300"
                      >
                        {t('common.cancel')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="text-dark-400">{t('referral.withdrawal.noHistory')}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
