import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';

import { balanceApi } from '../api/balance';
import { useToast } from '../components/Toast';
import { useDestructiveConfirm } from '../platform/hooks/useNativeDialog';

import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { BackIcon } from '@/components/icons';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';

function formatCardDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
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

  return (
    <motion.div
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
    </motion.div>
  );
}
