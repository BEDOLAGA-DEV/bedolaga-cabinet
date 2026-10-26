import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { HoverBorderGradient } from '../ui/hover-border-gradient';
import { ChevronRightIcon, SubscriptionIcon } from '@/components/icons';
import type { Subscription } from '../../types';
import {
  canOpenTariffSwitch,
  needsTariff,
  tariffSelectionPath,
} from '../../utils/legacySubscription';
import { buttonVariants } from '@/components/primitives/Button/Button.variants';
import { cn } from '@/lib/utils';

interface PurchaseCTAButtonProps {
  subscription: Subscription | null;
  /** In multi-tariff mode, link to /subscriptions/:id/renew instead of /subscription/purchase */
  isMultiTariff?: boolean;
  isTariffsMode?: boolean;
}

export default function PurchaseCTAButton({
  subscription,
  isMultiTariff = false,
  isTariffsMode = false,
}: PurchaseCTAButtonProps) {
  const { t } = useTranslation();

  const isExpired =
    !subscription ||
    (!subscription.is_active && !subscription.is_trial && !subscription.is_limited);
  const isTrial = subscription?.is_trial;
  const isDaily = subscription?.is_daily;
  // Старая подписка (куплена в классике, тарифа нет): продлить нельзя — ведём на витрину тарифов.
  const requiresTariff = needsTariff(subscription);

  if (isTariffsMode && subscription && canOpenTariffSwitch(subscription)) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        {!isDaily && (
          <Link
            to={`/subscriptions/${subscription.id}/renew`}
            className={cn(
              buttonVariants({ variant: 'primary', size: 'lg' }),
              'flex-none shadow-none hover:-translate-y-px hover:bg-accent-500 hover:shadow-none active:translate-y-0 active:bg-accent-500 focus-visible:ring-dark-100 sm:flex-1',
            )}
          >
            {t('subscription.extend')}
          </Link>
        )}
        <Link
          to={tariffSelectionPath(subscription.id)}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'lg' }),
            'flex-none focus-visible:ring-dark-100 sm:flex-1',
          )}
        >
          {t('subscription.switchTariff.title')}
        </Link>
      </div>
    );
  }

  // Daily tariffs renew automatically — no manual renewal button needed in multi-tariff
  if (isMultiTariff && isDaily && !isExpired) return null;

  const accentColor = isExpired ? 'rgb(var(--color-critical-500))' : 'rgb(var(--color-accent-400))';

  const buttonText = requiresTariff
    ? t('subscription.cta.moveToTariff')
    : isExpired
      ? t('subscription.getSubscription')
      : isTrial
        ? t('subscription.trialUpgrade.title')
        : t('subscription.extend');

  const hintText = isExpired
    ? t('subscription.cta.expiredHint')
    : requiresTariff
      ? t('subscription.cta.moveToTariffHint')
      : isTrial
        ? t('subscription.cta.trialHint')
        : isMultiTariff
          ? t('subscription.cta.renewHint', 'Продление подписки')
          : t('subscription.cta.activeHint');

  // Legacy (no tariff) → tariff catalog pinned to this subscription
  // Trial → purchase page (buy a real tariff, trial can't be renewed)
  // Multi-tariff active → per-subscription renew page
  // Otherwise → purchase page
  const linkTo =
    requiresTariff && subscription?.id
      ? tariffSelectionPath(subscription.id)
      : isTrial
        ? '/subscription/purchase'
        : isMultiTariff && subscription?.id
          ? `/subscriptions/${subscription.id}/renew`
          : '/subscription/purchase';

  return (
    <Link to={linkTo} className="block">
      <HoverBorderGradient
        accentColor={accentColor}
        duration={4}
        className="group relative w-full cursor-pointer overflow-hidden rounded-2xl"
      >
        <div
          className="relative flex items-center justify-between rounded-[14px] px-5 py-4 transition-colors duration-300"
          style={{
            background: isExpired
              ? 'linear-gradient(135deg, rgba(255,59,92,0.08), rgba(255,107,53,0.06))'
              : 'linear-gradient(135deg, rgba(var(--color-accent-400), 0.08), rgba(var(--color-accent-400), 0.06))',
          }}
        >
          {/* Left: icon + text */}
          <div className="flex items-center gap-3">
            {/* Sparkle icon */}
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: isExpired
                  ? 'rgba(255,59,92,0.12)'
                  : 'rgba(var(--color-accent-400), 0.12)',
                color: accentColor,
              }}
            >
              <SubscriptionIcon className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-dark-50">{buttonText}</div>
              <div className="text-[12px] text-dark-400">{hintText}</div>
            </div>
          </div>

          {/* Right: chevron */}
          <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-dark-400 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </HoverBorderGradient>
    </Link>
  );
}
