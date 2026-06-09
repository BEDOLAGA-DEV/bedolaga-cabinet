import { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { landingApi, type GiftClaimResult } from '../api/landings';
import { getApiErrorMessage } from '../utils/api-error';
import { copyToClipboard } from '@/utils/clipboard';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { cn } from '@/lib/utils';
import { CheckCircleIcon, CheckIcon, CopyIcon } from '@/components/icons';

const MAX_POLL_MS = 10 * 60 * 1000; // poll an unsettled payment for up to 10 min

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-dark-800/50 bg-dark-900/50 p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}

export default function GiftClaim() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startedAt = useRef(Date.now());

  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [result, setResult] = useState<GiftClaimResult | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    data: gift,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['gift-claim', token],
    queryFn: () => landingApi.getGiftClaim(token!),
    enabled: !!token,
    retry: 1,
    // Poll only while the payment is still settling (not yet claimable / terminal).
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      if (Date.now() - startedAt.current > MAX_POLL_MS) return false;
      const settled = data.is_claimable || data.status === 'delivered' || data.status === 'failed';
      return settled ? false : 3000;
    },
  });

  const claimMutation = useMutation({
    mutationFn: () => landingApi.claimGift(token!, email.trim()),
    onSuccess: (res) => {
      // One-click cabinet login for a fresh email account; otherwise show the link.
      if (res.auto_login_token) {
        navigate(`/auto-login?token=${encodeURIComponent(res.auto_login_token)}`);
        return;
      }
      setResult(res);
    },
    onError: (err) => {
      setClaimError(
        getApiErrorMessage(err, t('landing.giftClaim.error', 'Could not activate the gift.')),
      );
    },
  });

  const willReplace = gift?.status === 'pending_activation';

  const handleCopyLink = async () => {
    const url = result?.subscription_url;
    if (!url) return;
    try {
      await copyToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const periodLabel = useMemo(() => {
    const days = gift?.period_days;
    if (!days) return '';
    return `${days} ${t('gift.days', 'days')}`;
  }, [gift?.period_days, t]);

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Spinner className="h-12 w-12 border-[3px]" />
          <p className="text-sm text-dark-400">{t('common.loading', 'Loading...')}</p>
        </div>
      </Shell>
    );
  }

  // 404 / unknown gift
  if (error || !gift || !gift.is_gift) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <h1 className="text-lg font-semibold text-dark-50">
            {t('landing.giftClaim.notFoundTitle', 'Gift not found')}
          </h1>
          <p className="text-sm text-dark-400">
            {t(
              'landing.giftClaim.notFoundDesc',
              'This gift link is invalid or no longer available.',
            )}
          </p>
        </div>
      </Shell>
    );
  }

  // Already activated
  if (gift.status === 'delivered' && !result) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircleIcon className="h-14 w-14 text-success-400" />
          <h1 className="text-xl font-bold text-dark-50">
            {t('landing.giftClaim.alreadyTitle', 'Gift already activated')}
          </h1>
          <p className="text-sm text-dark-400">
            {t('landing.giftClaim.alreadyDesc', 'This gift has already been claimed.')}
          </p>
        </div>
      </Shell>
    );
  }

  // Payment failed/expired → tell the recipient instead of spinning forever
  if (gift.status === 'failed' || gift.status === 'expired') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <h1 className="text-lg font-semibold text-dark-50">
            {t('landing.giftClaim.failedTitle', 'Gift unavailable')}
          </h1>
          <p className="text-sm text-dark-400">
            {t(
              'landing.giftClaim.failedDesc',
              'The payment for this gift did not go through, so it cannot be activated.',
            )}
          </p>
        </div>
      </Shell>
    );
  }

  // Successful web claim → show connection link
  if (result) {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 text-center"
        >
          <AnimatedCheckmark />
          <h1 className="text-xl font-bold text-dark-50">
            {t('landing.giftClaim.successTitle', 'Gift activated!')}
          </h1>
          {result.subscription_url && (
            <>
              <p className="text-sm text-dark-300">
                {t('landing.giftClaim.connectDesc', 'Use this link to connect:')}
              </p>
              <p className="w-full select-all truncate rounded-lg bg-dark-900/60 px-3 py-2 text-sm text-accent-400">
                {result.subscription_url}
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98]',
                  copied
                    ? 'bg-success-500/20 text-success-400'
                    : 'bg-accent-500 text-white hover:bg-accent-400',
                )}
              >
                {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                {copied
                  ? t('common.copied', 'Copied!')
                  : t('landing.giftClaim.copyLink', 'Copy link')}
              </button>
            </>
          )}
        </motion.div>
      </Shell>
    );
  }

  // Payment still settling
  if (!gift.is_claimable) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Spinner className="h-12 w-12 border-[3px]" />
          <h1 className="text-lg font-semibold text-dark-50">
            {t('landing.giftClaim.pendingTitle', 'Almost ready...')}
          </h1>
          <p className="text-sm text-dark-400">
            {t(
              'landing.giftClaim.pendingDesc',
              'The payment is still being confirmed. This page will update automatically.',
            )}
          </p>
        </div>
      </Shell>
    );
  }

  // Claimable — offer Telegram + web arms
  return (
    <Shell>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5 text-center"
      >
        <div className="text-4xl">🎁</div>
        <div>
          <h1 className="text-xl font-bold text-dark-50">
            {t('landing.giftClaim.title', 'You have a gift!')}
          </h1>
          {gift.tariff_name && (
            <p className="mt-1 text-sm text-dark-300">
              {gift.tariff_name}
              {periodLabel ? ` — ${periodLabel}` : ''}
            </p>
          )}
        </div>

        {gift.gift_message && (
          <div className="w-full rounded-xl border border-dark-700/30 bg-dark-800/40 p-4 text-left">
            <p className="text-sm italic text-dark-200">&ldquo;{gift.gift_message}&rdquo;</p>
          </div>
        )}

        {willReplace && (
          <p className="w-full rounded-lg border border-warning-500/20 bg-warning-500/5 p-3 text-xs text-warning-400">
            {t(
              'landing.giftClaim.replaceWarning',
              'You already have a subscription — activating this gift will replace it.',
            )}
          </p>
        )}

        {/* Telegram arm */}
        {gift.bot_claim_link && (
          <a
            href={gift.bot_claim_link}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent-500/25 transition-all hover:bg-accent-400 active:scale-[0.98]"
          >
            {t('landing.giftClaim.activateTelegram', 'Activate in Telegram')}
          </a>
        )}

        {/* Web/email arm */}
        {!showEmail ? (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="w-full rounded-xl border border-dark-700/50 px-6 py-3 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-800/50"
          >
            {t('landing.giftClaim.activateWeb', 'Activate by email')}
          </button>
        ) : (
          <div className="w-full space-y-3 text-left">
            <label htmlFor="claim-email" className="block text-sm font-medium text-dark-200">
              {t('landing.giftClaim.emailLabel', 'Your email')}
            </label>
            <input
              id="claim-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setClaimError(null);
              }}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 px-4 py-3 text-sm text-dark-50 placeholder-dark-500 outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25"
            />
            {claimError && <p className="text-sm text-error-400">{claimError}</p>}
            <button
              type="button"
              disabled={!isValidEmail(email) || claimMutation.isPending}
              onClick={() => claimMutation.mutate()}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-all',
                isValidEmail(email) && !claimMutation.isPending
                  ? 'bg-accent-500 text-white hover:bg-accent-400 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-dark-800 text-dark-500',
              )}
            >
              {claimMutation.isPending ? (
                <Spinner className="h-5 w-5 border-2" />
              ) : (
                t('landing.giftClaim.claimNow', 'Get my gift')
              )}
            </button>
          </div>
        )}
      </motion.div>
    </Shell>
  );
}
