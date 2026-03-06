import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';

import { balanceApi } from '../api/balance';
import { useToast } from '../components/Toast';

import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';

const ArrowLeftIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

export default function SavedCards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: savedCardsData, refetch: refetchSavedCards } = useQuery({
    queryKey: ['saved-cards'],
    queryFn: balanceApi.getSavedCards,
  });
  const savedCards = savedCardsData?.cards;

  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);

  const handleDeleteCard = async (cardId: number) => {
    if (!confirm(t('balance.savedCards.confirmUnlink'))) return;
    setDeletingCardId(cardId);
    try {
      await balanceApi.deleteSavedCard(cardId);
      await refetchSavedCards();
      queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
      showToast({
        type: 'success',
        title: t('balance.savedCards.unlinkSuccess'),
        message: '',
        duration: 3000,
      });
    } catch {
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
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">
          {t('balance.savedCards.pageTitle')}
        </h1>
      </motion.div>

      {/* Cards List */}
      {savedCards && savedCards.length > 0 ? (
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
                          date: new Date(card.created_at).toLocaleDateString(),
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
      ) : savedCards ? (
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
