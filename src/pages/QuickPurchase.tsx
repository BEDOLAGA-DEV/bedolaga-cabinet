import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { landingApi } from '../api/landings';
import type {
  LandingConfig,
  LandingTariff,
  LandingTariffPeriod,
  LandingPaymentMethod,
  PurchaseRequest,
} from '../api/landings';
import { StaticBackgroundRenderer } from '../components/backgrounds/BackgroundRenderer';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../utils/api-error';
import { formatPrice } from '../utils/format';

function detectContactType(value: string): 'email' | 'telegram' {
  return value.startsWith('@') ? 'telegram' : 'email';
}

function isValidContact(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('@')) {
    return trimmed.length >= 4;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function formatPeriodLabel(
  days: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const key = `landing.periodLabels.d${days}`;
  const result = t(key);
  if (result !== key) return result;

  const months = Math.floor(days / 30);
  const remainder = days % 30;
  if (months > 0 && remainder === 0) {
    return t('landing.periodLabels.nMonths', { count: months });
  }
  return t('landing.periodLabels.nDays', { count: days });
}

// ============================================================
// Sub-components
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-accent-500" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950 px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-500/10">
          <svg
            className="h-8 w-8 text-error-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-dark-50">{t('landing.error', 'Error')}</h2>
        <p className="text-sm text-dark-300">{message}</p>
      </div>
    </div>
  );
}

function PeriodTabs({
  periods,
  selectedDays,
  onSelect,
}: {
  periods: LandingTariffPeriod[];
  selectedDays: number;
  onSelect: (days: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((period) => (
        <button
          key={period.days}
          type="button"
          onClick={() => onSelect(period.days)}
          className={cn(
            'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
            selectedDays === period.days
              ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25'
              : 'bg-dark-800/50 text-dark-300 hover:bg-dark-700/50 hover:text-dark-100',
          )}
        >
          {formatPeriodLabel(period.days, t)}
        </button>
      ))}
    </div>
  );
}

function GiftToggle({ isGift, onToggle }: { isGift: boolean; onToggle: (v: boolean) => void }) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('landing.giftToggleLabel', 'Purchase type')}
      className="flex rounded-xl bg-dark-800/50 p-1"
    >
      <button
        type="button"
        onClick={() => onToggle(false)}
        aria-pressed={!isGift}
        className={cn(
          'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
          !isGift ? 'bg-dark-700 text-dark-50 shadow-sm' : 'text-dark-400 hover:text-dark-200',
        )}
      >
        {t('landing.forMe', 'For me')}
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        aria-pressed={isGift}
        className={cn(
          'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
          isGift ? 'bg-dark-700 text-dark-50 shadow-sm' : 'text-dark-400 hover:text-dark-200',
        )}
      >
        {t('landing.asGift', 'As a gift')}
      </button>
    </div>
  );
}

function ContactForm({
  contactValue,
  onContactChange,
  isGift,
  giftRecipient,
  onGiftRecipientChange,
  giftMessage,
  onGiftMessageChange,
}: {
  contactValue: string;
  onContactChange: (v: string) => void;
  isGift: boolean;
  giftRecipient: string;
  onGiftRecipientChange: (v: string) => void;
  giftMessage: string;
  onGiftMessageChange: (v: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 rounded-2xl border border-dark-800/50 bg-dark-900/50 p-5">
      {/* Main contact */}
      <div>
        <label htmlFor="contact-input" className="mb-2 block text-sm font-medium text-dark-200">
          {t('landing.yourContact', 'Your contact')}
        </label>
        <input
          id="contact-input"
          type="text"
          value={contactValue}
          onChange={(e) => onContactChange(e.target.value)}
          placeholder={t('landing.contactPlaceholder', 'email@example.com or @telegram')}
          className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 px-4 py-3 text-sm text-dark-50 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25"
        />
        <p className="mt-1.5 text-xs text-dark-500">{t('landing.contactHint')}</p>
      </div>

      {/* Gift fields */}
      <AnimatePresence mode="wait">
        {isGift && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="border-t border-dark-800/50 pt-4">
              <label
                htmlFor="gift-recipient-input"
                className="mb-2 block text-sm font-medium text-dark-200"
              >
                {t('landing.recipientLabel')}
              </label>
              <input
                id="gift-recipient-input"
                type="text"
                value={giftRecipient}
                onChange={(e) => onGiftRecipientChange(e.target.value)}
                placeholder={t('landing.recipientPlaceholder', 'Recipient email or @telegram')}
                className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 px-4 py-3 text-sm text-dark-50 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25"
              />
            </div>
            <div>
              <label
                htmlFor="gift-message-input"
                className="mb-2 block text-sm font-medium text-dark-200"
              >
                {t('landing.giftMessageLabel')}
              </label>
              <textarea
                id="gift-message-input"
                value={giftMessage}
                onChange={(e) => onGiftMessageChange(e.target.value)}
                placeholder={t(
                  'landing.giftMessagePlaceholder',
                  'Add a personal message (optional)',
                )}
                rows={3}
                className="w-full resize-none rounded-xl border border-dark-700/50 bg-dark-800/50 px-4 py-3 text-sm text-dark-50 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TariffCard({
  tariff,
  isSelected,
  selectedPeriod,
  onSelect,
}: {
  tariff: LandingTariff;
  isSelected: boolean;
  selectedPeriod: LandingTariffPeriod | undefined;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={cn(
        'relative flex w-full flex-col rounded-2xl border p-5 text-start transition-all duration-200',
        isSelected
          ? 'border-accent-500/50 bg-accent-500/5 ring-1 ring-accent-500/25'
          : 'border-dark-800/50 bg-dark-900/50 hover:border-dark-700/50 hover:bg-dark-800/30',
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-dark-50">{tariff.name}</h3>
          {tariff.description && (
            <p className="mt-0.5 text-xs text-dark-400">{tariff.description}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isSelected ? 'border-accent-500 bg-accent-500' : 'border-dark-600',
          )}
        >
          {isSelected && (
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs text-dark-400">
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          {tariff.traffic_limit_gb === 0 ? '∞' : tariff.traffic_limit_gb} {t('landing.gb', 'GB')}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
            />
          </svg>
          {tariff.device_limit} {t('landing.devices', 'devices')}
        </span>
      </div>

      {/* Price */}
      {selectedPeriod && (
        <div className="mt-3 border-t border-dark-800/30 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-accent-400">
              {formatPrice(selectedPeriod.price_kopeks)}
            </span>
            {selectedPeriod.original_price_kopeks != null &&
              selectedPeriod.original_price_kopeks > selectedPeriod.price_kopeks && (
                <>
                  <span className="text-sm text-dark-500 line-through">
                    {formatPrice(selectedPeriod.original_price_kopeks)}
                  </span>
                  {selectedPeriod.discount_percent != null && (
                    <span className="rounded-full bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-400">
                      -{selectedPeriod.discount_percent}%
                    </span>
                  )}
                </>
              )}
          </div>
        </div>
      )}
    </button>
  );
}

function PaymentMethodCard({
  method,
  isSelected,
  selectedSubOption,
  onSelect,
  onSelectSubOption,
}: {
  method: LandingPaymentMethod;
  isSelected: boolean;
  selectedSubOption: string | null;
  onSelect: () => void;
  onSelectSubOption: (subOptionId: string) => void;
}) {
  const hasSubOptions = method.sub_options && method.sub_options.length > 1;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        isSelected
          ? 'border-accent-500/50 bg-accent-500/5'
          : 'border-dark-800/50 bg-dark-900/50 hover:border-dark-700/50 hover:bg-dark-800/30',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={onSelect}
        className="flex w-full items-center gap-4 p-4 text-start"
      >
        {/* Icon */}
        {method.icon_url && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-dark-800/50">
            <img src={method.icon_url} alt="" className="h-6 w-6 object-contain" />
          </div>
        )}

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-dark-100">{method.display_name}</p>
          {method.description && (
            <p className="mt-0.5 truncate text-xs text-dark-400">{method.description}</p>
          )}
        </div>

        {/* Radio */}
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isSelected ? 'border-accent-500 bg-accent-500' : 'border-dark-600',
          )}
        >
          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
        </div>
      </button>

      {/* Sub-options */}
      {isSelected && hasSubOptions && (
        <div className="border-t border-dark-800/30 px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {method.sub_options!.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectSubOption(opt.id)}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
                  selectedSubOption === opt.id
                    ? 'bg-accent-500 text-white shadow-sm shadow-accent-500/25'
                    : 'bg-dark-800/50 text-dark-300 hover:bg-dark-700/50 hover:text-dark-100',
                )}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = useMemo(() => {
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'b', 'i', 'br', 'span', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
    // Enforce rel="noopener noreferrer" and target="_blank" on all links
    const container = document.createElement('div');
    container.innerHTML = clean;
    container.querySelectorAll('a').forEach((a) => {
      a.setAttribute('rel', 'noopener noreferrer');
      a.setAttribute('target', '_blank');
    });
    return container.innerHTML;
  }, [html]);

  return (
    <div className={cn('break-words', className)} dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}

function SummaryCard({
  config,
  selectedTariff,
  selectedPeriod,
  currentPrice,
  isSubmitting,
  canSubmit,
  submitError,
  onSubmit,
}: {
  config: LandingConfig;
  selectedTariff: LandingTariff | undefined;
  selectedPeriod: LandingTariffPeriod | undefined;
  currentPrice: number;
  isSubmitting: boolean;
  canSubmit: boolean;
  submitError: string | null;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-2xl border border-dark-800/50 bg-dark-900/50 p-5">
        {selectedTariff && (
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-dark-500">
              {t('landing.selectedTariff', 'Tariff')}
            </p>
            <p className="mt-1 text-sm font-semibold text-dark-50">{selectedTariff.name}</p>
          </div>
        )}
        {selectedPeriod && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-dark-500">
              {t('landing.period', 'Period')}
            </p>
            <p className="mt-1 text-sm text-dark-200">
              {formatPeriodLabel(selectedPeriod.days, t)}
            </p>
          </div>
        )}
        <div className="border-t border-dark-800/50 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-dark-500">
            {t('landing.total', 'Total')}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-accent-400">{formatPrice(currentPrice)}</span>
            {selectedPeriod?.original_price_kopeks != null &&
              selectedPeriod.original_price_kopeks > selectedPeriod.price_kopeks && (
                <>
                  <span className="text-base text-dark-500 line-through">
                    {formatPrice(selectedPeriod.original_price_kopeks)}
                  </span>
                  {selectedPeriod.discount_percent != null && (
                    <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-xs font-bold text-accent-400">
                      -{selectedPeriod.discount_percent}%
                    </span>
                  )}
                </>
              )}
          </div>
        </div>
      </div>

      {/* Features */}
      {config.features.length > 0 && (
        <div className="space-y-3">
          {config.features.map((feature, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-500/10">
                <svg
                  className="h-3 w-3 text-success-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-dark-100">{feature.title}</p>
                <p className="text-xs text-dark-400">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-error-500/20 bg-error-500/5 p-3"
          >
            <p className="text-sm text-error-400">{submitError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pay button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200',
          canSubmit && !isSubmitting
            ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25 hover:bg-accent-400 hover:shadow-accent-500/40 active:scale-[0.98]'
            : 'cursor-not-allowed bg-dark-800 text-dark-500',
        )}
      >
        {isSubmitting ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            {t('landing.pay', 'Pay')}{' '}
            {selectedPeriod?.original_price_kopeks != null &&
              selectedPeriod.original_price_kopeks > selectedPeriod.price_kopeks && (
                <span className="mr-1 text-sm font-normal text-white/50 line-through">
                  {formatPrice(selectedPeriod.original_price_kopeks)}
                </span>
              )}
            {formatPrice(currentPrice)}
          </>
        )}
      </button>

      {/* Footer */}
      {config.footer_text && (
        <SanitizedHtml
          html={config.footer_text}
          className="text-center text-xs leading-relaxed text-dark-500 [&_a]:text-accent-400 [&_a]:underline [&_a]:underline-offset-2"
        />
      )}
    </div>
  );
}

// ============================================================
// Discount Countdown
// ============================================================

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-dark-800/80 text-lg font-bold tabular-nums text-dark-50 sm:h-12 sm:w-12 sm:text-xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-dark-500">{label}</span>
    </div>
  );
}

function calcTimeLeft(endTime: number) {
  const diff = Math.max(0, endTime - Date.now());
  return {
    diff,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function DiscountBanner({
  discount,
  onExpired,
}: {
  discount: { percent: number; ends_at: string; badge_text: string | null };
  onExpired: () => void;
}) {
  const { t } = useTranslation();
  const endTime = useMemo(() => new Date(discount.ends_at).getTime(), [discount.ends_at]);
  const initial = useMemo(() => calcTimeLeft(endTime), [endTime]);
  const [timeLeft, setTimeLeft] = useState(initial);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const fresh = calcTimeLeft(endTime);
    setTimeLeft(fresh);
    if (fresh.diff === 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpired();
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const tl = calcTimeLeft(endTime);
      setTimeLeft(tl);
      if (tl.diff === 0) {
        clearInterval(intervalRef.current);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpired();
        }
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [endTime, onExpired]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-8 overflow-hidden rounded-2xl border border-accent-500/30 bg-gradient-to-r from-accent-500/10 via-accent-500/5 to-transparent"
    >
      <div className="flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:justify-between">
        {/* Left: badge + text */}
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-full bg-accent-500 px-3 py-1 text-sm font-bold text-white shadow-lg shadow-accent-500/25">
            -{discount.percent}%
          </span>
          {discount.badge_text && (
            <span className="text-sm font-medium text-dark-100">{discount.badge_text}</span>
          )}
        </div>

        {/* Right: countdown */}
        <div className="flex items-center gap-1.5">
          {timeLeft.days > 0 && (
            <>
              <TimeUnit value={timeLeft.days} label={t('landing.discount.days', 'd')} />
              <span className="text-lg font-bold text-dark-500">:</span>
            </>
          )}
          <TimeUnit value={timeLeft.hours} label={t('landing.discount.hours', 'h')} />
          <span className="text-lg font-bold text-dark-500">:</span>
          <TimeUnit value={timeLeft.minutes} label={t('landing.discount.minutes', 'm')} />
          <span className="text-lg font-bold text-dark-500">:</span>
          <TimeUnit value={timeLeft.seconds} label={t('landing.discount.seconds', 's')} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function QuickPurchase() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch config
  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['landing-config', slug, i18n.language],
    queryFn: () => landingApi.getConfig(slug!, i18n.language),
    enabled: !!slug,
    staleTime: 60_000,
    retry: 1,
  });

  const [discountExpired, setDiscountExpired] = useState(false);

  const handleDiscountExpired = useCallback(() => {
    setDiscountExpired(true);
    queryClient.invalidateQueries({ queryKey: ['landing-config', slug] });
  }, [queryClient, slug]);

  // Reset expired flag when config changes (e.g. new discount scheduled)
  useEffect(() => {
    if (config?.discount) setDiscountExpired(false);
  }, [config?.discount]);

  // Selection state
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null);
  const [selectedPeriodDays, setSelectedPeriodDays] = useState<number | null>(null);
  const [contactValue, setContactValue] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup redirect timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  // Collect ALL unique periods across ALL tariffs
  const allPeriods = useMemo(() => {
    if (!config) return [];
    const periodMap = new Map<number, LandingTariffPeriod>();
    for (const tariff of config.tariffs) {
      for (const period of tariff.periods) {
        if (!periodMap.has(period.days)) {
          periodMap.set(period.days, period);
        }
      }
    }
    return Array.from(periodMap.values()).sort((a, b) => a.days - b.days);
  }, [config]);

  // Filter tariffs to only those that have the selected period
  const visibleTariffs = useMemo(() => {
    if (!config || !selectedPeriodDays) return config?.tariffs ?? [];
    return config.tariffs.filter((tariff) =>
      tariff.periods.some((p) => p.days === selectedPeriodDays),
    );
  }, [config, selectedPeriodDays]);

  // Auto-select first tariff, period, method on config load
  useEffect(() => {
    if (!config) return;

    // Auto-select first period from all available periods
    if (allPeriods.length > 0 && selectedPeriodDays === null) {
      setSelectedPeriodDays(allPeriods[0].days);
    }

    // Auto-select first visible tariff
    if (visibleTariffs.length > 0 && selectedTariffId === null) {
      setSelectedTariffId(visibleTariffs[0].id);
    }

    if (config.payment_methods.length > 0 && selectedMethod === null) {
      const firstMethod = config.payment_methods[0];
      setSelectedMethod(firstMethod.method_id);
      if (firstMethod.sub_options && firstMethod.sub_options.length >= 1) {
        setSelectedSubOption(firstMethod.sub_options[0].id);
      } else {
        setSelectedSubOption(null);
      }
    }
  }, [config, allPeriods, visibleTariffs, selectedTariffId, selectedPeriodDays, selectedMethod]);

  // When period changes, auto-select first visible tariff if current is hidden
  useEffect(() => {
    if (!visibleTariffs.length) return;
    const currentVisible = visibleTariffs.find((tariff) => tariff.id === selectedTariffId);
    if (!currentVisible) {
      setSelectedTariffId(visibleTariffs[0].id);
    }
  }, [visibleTariffs, selectedTariffId]);

  // SEO: set document title
  useEffect(() => {
    if (!config?.meta_title) return;
    const prev = document.title;
    document.title = config.meta_title;
    return () => {
      document.title = prev;
    };
  }, [config?.meta_title]);

  // SEO: set meta description
  useEffect(() => {
    if (!config?.meta_description) return;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prev = meta.content;
    meta.content = config.meta_description;
    return () => {
      meta!.content = prev;
    };
  }, [config?.meta_description]);

  // Inject custom CSS (sanitized)
  useEffect(() => {
    if (!config?.custom_css) return;

    let css = config.custom_css;
    // Strip all at-rules (including @font-face, @import, @charset, @namespace, @keyframes, @media)
    css = css.replace(/@[a-zA-Z-]+\s*[^{}]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
    css = css.replace(/@[a-zA-Z-]+\s*[^;{}]+;/g, '');
    // Strip ALL url() including data: URIs
    css = css.replace(/url\s*\([^)]*\)/gi, 'url(about:blank)');
    // Strip expression(), behavior, -moz-binding
    css = css.replace(/expression\s*\([^)]*\)/gi, '');
    css = css.replace(/behavior\s*:[^;]+/gi, '');
    css = css.replace(/-moz-binding\s*:[^;]+/gi, '');
    // Strip content property (prevents text injection via ::before/::after)
    css = css.replace(/content\s*:[^;]+;/gi, '');
    // Strip CSS escape sequences that could bypass filters
    css = css.replace(/\\[0-9a-fA-F]{1,6}\s?/g, '');

    const style = document.createElement('style');
    style.setAttribute('data-landing-css', 'true');
    style.textContent = css;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [config?.custom_css]);

  // Derived data
  const selectedTariff = useMemo(
    () => config?.tariffs.find((tr) => tr.id === selectedTariffId),
    [config?.tariffs, selectedTariffId],
  );

  const selectedPeriod = useMemo(
    () => selectedTariff?.periods.find((p) => p.days === selectedPeriodDays),
    [selectedTariff, selectedPeriodDays],
  );

  const currentPrice = selectedPeriod?.price_kopeks ?? 0;

  // Validation
  const canSubmit = useMemo(() => {
    if (!selectedTariffId || !selectedPeriodDays || !selectedMethod) return false;
    if (!isValidContact(contactValue)) return false;
    if (isGift && !isValidContact(giftRecipient)) return false;
    return true;
  }, [selectedTariffId, selectedPeriodDays, selectedMethod, contactValue, isGift, giftRecipient]);

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: (data: PurchaseRequest) => landingApi.createPurchase(slug!, data),
    onSuccess: (result) => {
      window.location.href = result.payment_url;
      // If redirect blocked (popup blocker etc.), reset after 5s
      redirectTimeoutRef.current = setTimeout(() => setIsSubmitting(false), 5000);
    },
    onError: (err) => {
      const msg = getApiErrorMessage(
        err,
        t('landing.purchaseError', 'Something went wrong. Please try again.'),
      );
      setSubmitError(msg);
      setIsSubmitting(false);
    },
  });

  // Submit handler
  const handleSubmit = () => {
    if (!canSubmit || !slug || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Build the payment_method string: append sub-option suffix if selected
    // e.g. "platega" + "2" → "platega_2", "yookassa" + "sbp" → "yookassa_sbp"
    let paymentMethod = selectedMethod!;
    if (selectedSubOption) {
      paymentMethod = `${paymentMethod}_${selectedSubOption}`;
    }

    const data: PurchaseRequest = {
      tariff_id: selectedTariffId!,
      period_days: selectedPeriodDays!,
      contact_type: detectContactType(contactValue),
      contact_value: contactValue.trim(),
      payment_method: paymentMethod,
      is_gift: isGift,
    };

    if (isGift && giftRecipient) {
      data.gift_recipient_type = detectContactType(giftRecipient);
      data.gift_recipient_value = giftRecipient.trim();
      data.gift_message = giftMessage.trim() || undefined;
    }

    purchaseMutation.mutate(data);
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error || !config) {
    const errMsg = getApiErrorMessage(error, t('landing.notFound', 'Landing page not found'));
    return <ErrorState message={errMsg} />;
  }

  const showTariffCards = visibleTariffs.length > 1;

  return (
    <div className={cn('min-h-dvh overflow-x-hidden', !config.background_config && 'bg-dark-950')}>
      {config.background_config && <StaticBackgroundRenderer config={config.background_config} />}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Language switcher */}
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight text-dark-50 sm:text-4xl">
            {config.title}
          </h1>
          {config.subtitle && (
            <p className="mt-3 text-base text-dark-300 sm:text-lg">{config.subtitle}</p>
          )}
        </motion.div>

        {/* Discount banner */}
        <AnimatePresence>
          {config.discount && !discountExpired && (
            <DiscountBanner discount={config.discount} onExpired={handleDiscountExpired} />
          )}
        </AnimatePresence>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="min-w-0 space-y-6"
          >
            {/* Period tabs */}
            {allPeriods.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
                  {t('landing.choosePeriod', 'Choose period')}
                </h2>
                <PeriodTabs
                  periods={allPeriods}
                  selectedDays={selectedPeriodDays ?? 0}
                  onSelect={setSelectedPeriodDays}
                />
              </div>
            )}

            {/* Gift toggle */}
            {config.gift_enabled && <GiftToggle isGift={isGift} onToggle={setIsGift} />}

            {/* Contact form */}
            <ContactForm
              contactValue={contactValue}
              onContactChange={(v) => {
                setContactValue(v);
                setSubmitError(null);
              }}
              isGift={isGift}
              giftRecipient={giftRecipient}
              onGiftRecipientChange={(v) => {
                setGiftRecipient(v);
                setSubmitError(null);
              }}
              giftMessage={giftMessage}
              onGiftMessageChange={setGiftMessage}
            />

            {/* Tariff cards */}
            {showTariffCards && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
                  {t('landing.chooseTariff', 'Choose tariff')}
                </h2>
                <div
                  role="radiogroup"
                  aria-label={t('landing.chooseTariff', 'Choose tariff')}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {visibleTariffs.map((tariff) => {
                    const period = tariff.periods.find((p) => p.days === selectedPeriodDays);
                    return (
                      <TariffCard
                        key={tariff.id}
                        tariff={tariff}
                        isSelected={tariff.id === selectedTariffId}
                        selectedPeriod={period}
                        onSelect={() => setSelectedTariffId(tariff.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment methods */}
            {config.payment_methods.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
                  {t('landing.paymentMethod', 'Payment method')}
                </h2>
                <div
                  role="radiogroup"
                  aria-label={t('landing.paymentMethod', 'Payment method')}
                  className="space-y-2"
                >
                  {config.payment_methods.map((method) => (
                    <PaymentMethodCard
                      key={method.method_id}
                      method={method}
                      isSelected={method.method_id === selectedMethod}
                      selectedSubOption={
                        method.method_id === selectedMethod ? selectedSubOption : null
                      }
                      onSelect={() => {
                        setSelectedMethod(method.method_id);
                        // Auto-select first sub-option (even for single — backend needs suffix)
                        if (method.sub_options && method.sub_options.length >= 1) {
                          setSelectedSubOption(method.sub_options[0].id);
                        } else {
                          setSelectedSubOption(null);
                        }
                      }}
                      onSelectSubOption={setSelectedSubOption}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right column (sticky sidebar / bottom on mobile) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="min-w-0 lg:sticky lg:top-8 lg:self-start"
          >
            <SummaryCard
              config={config}
              selectedTariff={selectedTariff}
              selectedPeriod={selectedPeriod}
              currentPrice={currentPrice}
              isSubmitting={isSubmitting}
              canSubmit={canSubmit}
              submitError={submitError}
              onSubmit={handleSubmit}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
