import { uiLocale } from '@/utils/uiLocale';
import { useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';

import { balanceApi } from '../api/balance';
import { subscriptionApi } from '../api/subscription';
import { useToast } from '../components/Toast';
import { useDestructiveConfirm } from '../platform/hooks/useNativeDialog';
import type { SbpRecurringInfo, SubscriptionListItem } from '../types';

import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { BackIcon } from '@/components/icons';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';

function formatCardDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(uiLocale());
  } catch {
    return dateStr;
  }
}

/** Human-readable locale key for an SBP binding status (mirrors Subscription.tsx). */
function sbpStatusLabelKey(status: string): string | null {
  switch (status) {
    case 'PENDING':
      return 'subscription.sbpRecurring.statusPending';
    case 'ACTIVE':
      return 'subscription.sbpRecurring.statusActive';
    case 'PAST_DUE':
      return 'subscription.sbpRecurring.statusPastDue';
    default:
      return null;
  }
}

interface SbpBinding {
  sub: SubscriptionListItem;
  info: SbpRecurringInfo;
}

export default function SavedCards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirmDelete = useDestructiveConfirm();

  const {
    data: savedCardsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['saved-cards'],
    queryFn: balanceApi.getSavedCards,
  });
  const savedCards = savedCardsData?.cards;

  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);

  const handleDeleteCard = async (cardId: number) => {
    if (deletingCardId !== null) return;
    const confirmed = await confirmDelete(
      t('balance.savedCards.confirmUnlink'),
      t('balance.savedCards.unlink'),
    );
    if (!confirmed) return;
    setDeletingCardId(cardId);
    try {
      await balanceApi.deleteSavedCard(cardId);
      await queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
      showToast({
        type: 'success',
        title: t('balance.savedCards.unlinkSuccess'),
        message: '',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to unlink card:', error);
      showToast({
        type: 'error',
        title: t('balance.savedCards.unlinkError'),
        message: '',
        duration: 3000,
      });
    } finally {
      setDeletingCardId(null);
    }
  };

  // ── SBP (Platega) recurring bindings ────────────────────────────────
  // Same query-key convention as the Subscription page (['sbp-recurring', subId])
  // so the caches are shared and don't refetch redundantly when navigating
  // between the two pages.
  const { data: subscriptionsData } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: subscriptionApi.getSubscriptions,
  });
  const nonTrialSubs = (subscriptionsData?.subscriptions ?? []).filter((sub) => !sub.is_trial);

  const sbpQueries = useQueries({
    queries: nonTrialSubs.map((sub) => ({
      queryKey: ['sbp-recurring', sub.id],
      queryFn: () => subscriptionApi.getSbpRecurring(sub.id),
      retry: false,
    })),
  });

  // No section at all when nothing is bound: either the feature is off
  // (every query 403s) or none of the subscriptions has an active binding.
  const sbpBindings: SbpBinding[] = nonTrialSubs.reduce<SbpBinding[]>((acc, sub, index) => {
    const info = sbpQueries[index]?.data;
    if (info && info.status !== 'none') {
      acc.push({ sub, info });
    }
    return acc;
  }, []);

  const [unlinkingSubId, setUnlinkingSubId] = useState<number | null>(null);
  const confirmUnlinkSbp = useDestructiveConfirm();

  const handleUnlinkSbp = async (subId: number) => {
    if (unlinkingSubId !== null) return;
    const confirmed = await confirmUnlinkSbp(
      t('subscription.sbpRecurring.confirmCancel'),
      t('subscription.sbpRecurring.cancel'),
    );
    if (!confirmed) return;
    setUnlinkingSubId(subId);
    try {
      await subscriptionApi.cancelSbpRecurring(subId);
      await queryClient.invalidateQueries({ queryKey: ['sbp-recurring', subId] });
      showToast({
        type: 'success',
        title: t('subscription.sbpRecurring.cancelled'),
        message: '',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to unlink SBP binding:', error);
      showToast({
        type: 'error',
        title: t('common.error'),
        message: '',
        duration: 3000,
      });
    } finally {
      setUnlinkingSubId(null);
    }
  };

  return (
    // key: remount the container when loading resolves — stagger orchestration
    // runs once on mount, so cards arriving from the API later would otherwise
    // stay stuck at their initial variant (opacity 0) after a hard refresh
    <motion.div
      key={isLoading ? 'loading' : 'ready'}
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center gap-3">
        <button
          onClick={() => navigate('/balance')}
          className="flex h-10 w-10 items-center justify-center rounded-linear border border-dark-700/30 bg-dark-800/50 text-dark-300 transition-colors hover:bg-dark-700/50 hover:text-dark-100"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">
          {t('balance.savedCards.pageTitle')}
        </h1>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-linear border border-dark-700/30 bg-dark-800/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 animate-pulse rounded bg-dark-700" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-dark-700" />
                      <div className="h-3 w-24 animate-pulse rounded bg-dark-700" />
                    </div>
                  </div>
                  <div className="h-8 w-20 animate-pulse rounded bg-dark-700" />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Error state */}
      {isError && (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="py-12 text-center">
              <div className="text-error-400">{t('balance.savedCards.loadError')}</div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Cards List */}
      {!isLoading && !isError && savedCards && savedCards.length > 0 ? (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="space-y-3">
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between rounded-linear border border-dark-700/30 bg-dark-800/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💳</span>
                    <div>
                      <div className="font-medium text-dark-100">
                        {card.title ||
                          `${card.card_type || t('balance.savedCards.card')} ${card.card_last4 ? `*${card.card_last4}` : ''}`}
                      </div>
                      <div className="text-xs text-dark-500">
                        {t('balance.savedCards.linkedAt', {
                          date: formatCardDate(card.created_at),
                        })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeleteCard(card.id)}
                    loading={deletingCardId === card.id}
                    className="text-error-400 hover:text-error-300"
                  >
                    {t('balance.savedCards.unlink')}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      ) : !isLoading && !isError && savedCards ? (
        /* Empty state - only show when data loaded and empty */
        <motion.div variants={staggerItem}>
          <Card>
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-linear-lg bg-dark-800">
                <span className="text-3xl">💳</span>
              </div>
              <div className="text-dark-400">{t('balance.savedCards.empty')}</div>
            </div>
          </Card>
        </motion.div>
      ) : null}

      {/* SBP (Platega) recurring bindings — convenience mirror of the
          per-subscription block on the Subscription page. Rendered only
          when at least one non-trial subscription has an active binding;
          hidden entirely when the feature is off or nothing is bound. */}
      {sbpBindings.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-dark-100">
              {t('balance.savedCards.sbpSection')}
            </h2>
            <div className="space-y-3">
              {sbpBindings.map(({ sub, info }) => {
                const statusKey = sbpStatusLabelKey(info.status);
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-linear border border-dark-700/30 bg-dark-800/30 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🔁</span>
                      <div>
                        <div className="font-medium text-dark-100">
                          {sub.tariff_name || `#${sub.id}`}
                        </div>
                        <div className="text-xs text-dark-500">
                          {t('balance.savedCards.sbpBinding')}
                          {statusKey ? ` · ${t(statusKey)}` : ''}
                          {info.next_charge_at
                            ? ` · ${t('subscription.sbpRecurring.nextCharge', {
                                date: new Date(info.next_charge_at).toLocaleDateString(uiLocale(), {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                }),
                              })}`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUnlinkSbp(sub.id)}
                      loading={unlinkingSubId === sub.id}
                      className="text-error-400 hover:text-error-300"
                    >
                      {t('balance.savedCards.sbpUnlink')}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
