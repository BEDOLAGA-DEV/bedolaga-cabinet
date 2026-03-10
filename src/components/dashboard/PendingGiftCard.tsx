import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { PendingGift } from '../../api/gift';

interface PendingGiftCardProps {
  gifts: PendingGift[];
  className?: string;
}

export default function PendingGiftCard({ gifts, className }: PendingGiftCardProps) {
  const { t } = useTranslation();

  if (gifts.length === 0) return null;

  return (
    <div className={className ?? 'space-y-3'}>
      {gifts.map((gift) => (
        <motion.div
          key={gift.token}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-accent-500/30 bg-gradient-to-r from-accent-500/10 via-purple-500/10 to-accent-500/10 p-5"
        >
          {/* Subtle glow effect */}
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent-500/10 blur-2xl" />

          <div className="relative flex items-start gap-4">
            {/* Gift icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-500/20">
              <svg
                className="h-6 w-6 text-accent-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-dark-50">{t('gift.pending.title')}</h3>
              <p className="mt-0.5 text-xs text-dark-300">
                {gift.tariff_name && (
                  <span>
                    {gift.tariff_name} — {gift.period_days} {t('gift.days')}
                  </span>
                )}
                {gift.sender_display && (
                  <span className="ml-1 text-dark-400">
                    {t('gift.pending.from', { sender: gift.sender_display })}
                  </span>
                )}
              </p>
              {gift.gift_message && (
                <p className="mt-1.5 line-clamp-2 text-xs italic text-dark-400">
                  &ldquo;{gift.gift_message}&rdquo;
                </p>
              )}
            </div>

            {/* Activate button */}
            <Link
              to={`/gift?tab=activate&code=${gift.token}`}
              className="shrink-0 rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-400"
            >
              {t('gift.pending.activate')}
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
