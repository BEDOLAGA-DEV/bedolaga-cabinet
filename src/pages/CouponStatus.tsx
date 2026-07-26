import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { couponsApi, CouponRedeemResponse } from '../api/coupons';
import { useAuthStore } from '../store/auth';
import { formatShortDate } from '../utils/format';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { TicketIcon } from '@/components/icons';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-dark-800/50 bg-dark-900/50 p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}

// The redeem endpoint answers 400 with a structured {detail: {code, message}} —
// map the stable machine code to a localized message.
const redeemErrorText = (err: unknown, t: (key: string) => string): string => {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail as { code?: string } | string | undefined;
    if (detail && typeof detail === 'object' && detail.code) {
      const known = ['invalid', 'expired', 'already_redeemed_by_you', 'internal'];
      if (known.includes(detail.code)) return t(`coupon.errors.${detail.code}`);
    }
  }
  return t('coupon.errors.generic');
};

export default function CouponStatus() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [redeemed, setRedeemed] = useState<CouponRedeemResponse | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const {
    data: coupon,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['coupon-status', token],
    queryFn: () => couponsApi.getCouponStatus(token!),
    enabled: !!token,
    // 404 is the expected answer for an invalid/consumed/expired token — the
    // common case for a shared link — so retrying only wastes a request against
    // the rate-limited public endpoint.
    retry: false,
  });

  const redeemMutation = useMutation({
    mutationFn: () => couponsApi.redeemCoupon(token!),
    onSuccess: (result) => {
      setRedeemError(null);
      setRedeemed(result);
    },
    onError: (err) => {
      setRedeemError(redeemErrorText(err, t));
    },
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </Shell>
    );
  }

  if (error || !coupon) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="mb-2 text-lg font-semibold text-dark-100">{t('coupon.notFound.title')}</h1>
          <p className="text-sm text-dark-400">{t('coupon.notFound.text')}</p>
        </div>
      </Shell>
    );
  }

  if (redeemed) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <AnimatedCheckmark />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-dark-100">
            {redeemed.renewed ? t('coupon.success.renewed') : t('coupon.success.activated')}
          </h1>
          <p className="text-sm text-dark-400">
            {redeemed.tariff_name} · {redeemed.period_days} {t('coupon.daysSuffix')}
            {redeemed.end_date && (
              <>
                <br />
                {t('coupon.success.until')} {formatShortDate(redeemed.end_date)}
              </>
            )}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center">
        <div className="mb-4 flex justify-center text-accent-400">
          <TicketIcon className="h-10 w-10" />
        </div>
        <h1 className="mb-1 text-lg font-semibold text-dark-100">{t('coupon.title')}</h1>
        <p className="mb-6 text-sm text-dark-400">{t('coupon.subtitle')}</p>

        <div className="mb-6 space-y-2 rounded-xl border border-dark-800 bg-dark-900 p-4 text-left text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-dark-400">{t('coupon.tariff')}</span>
            <span className="font-medium text-dark-100">{coupon.tariff_name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-dark-400">{t('coupon.period')}</span>
            <span className="font-medium text-dark-100">
              {coupon.period_days} {t('coupon.daysSuffix')}
            </span>
          </div>
          {coupon.valid_until && (
            <div className="flex justify-between gap-4">
              <span className="text-dark-400">{t('coupon.validUntil')}</span>
              <span className="font-medium text-dark-100">
                {formatShortDate(coupon.valid_until)}
              </span>
            </div>
          )}
        </div>

        {redeemError && (
          <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
            {redeemError}
          </div>
        )}

        <div className="space-y-3">
          {coupon.bot_link && (
            <a
              href={coupon.bot_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary block w-full text-center"
            >
              {t('coupon.openBot')}
            </a>
          )}
          {isAuthenticated ? (
            <button
              onClick={() => redeemMutation.mutate()}
              disabled={redeemMutation.isPending}
              className={`btn-secondary w-full ${redeemMutation.isPending ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {redeemMutation.isPending ? t('coupon.redeeming') : t('coupon.redeemCabinet')}
            </button>
          ) : (
            <p className="text-xs text-dark-500">{t('coupon.needAuth')}</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
