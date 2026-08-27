import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@/components/icons';
import { subscriptionApi } from '../../../api/subscription';
import { usePlatform } from '../../../platform';
import { useDestructiveConfirm } from '../../../platform/hooks/useNativeDialog';

// ──────────────────────────────────────────────────────────────────
// Delete-subscription sheet. Telegram path goes through the native
// destructive dialog and skips the inline expand; the web path expands
// an inline confirm panel with two buttons.
//
// Self-owns deleteLoading; parent only supplies the id, theme colour
// hints, open-state, and the onDeleted callback (used for navigate +
// invalidate after the API resolves).
// ──────────────────────────────────────────────────────────────────

export interface DeleteSubscriptionSheetProps {
  subscriptionId: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDeleted: () => void;
  /** color/background tokens already resolved from glassTheme */
  textSecondary: string;
}

export function DeleteSubscriptionSheet({
  subscriptionId,
  open,
  onOpen,
  onClose,
  onDeleted,
  textSecondary,
}: DeleteSubscriptionSheetProps) {
  const { t } = useTranslation();
  const { platform } = usePlatform();
  const destructiveConfirm = useDestructiveConfirm();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const performDelete = async () => {
    setDeleteLoading(true);
    try {
      await subscriptionApi.deleteSubscription(subscriptionId);
      onDeleted();
    } catch {
      setDeleteLoading(false);
      onClose();
    }
  };

  const handleTriggerClick = async () => {
    if (platform === 'telegram') {
      const confirmed = await destructiveConfirm(
        t(
          'subscription.deleteWarning',
          'Подписка будет удалена безвозвратно. Все данные, устройства и настройки будут потеряны.',
        ),
        t('subscription.confirmDelete', 'Да, удалить'),
        t('subscription.deleteTitle', 'Удалить подписку?'),
      );
      if (!confirmed) return;
      await performDelete();
    } else {
      onOpen();
    }
  };

  if (!open) {
    return (
      <button
        onClick={handleTriggerClick}
        disabled={deleteLoading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-error-400/20 bg-error-400/5 p-3.5 text-sm font-medium text-error-400 transition-colors hover:bg-error-400/10 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
        {t('subscription.delete', 'Удалить подписку')}
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl border border-error-400/20 p-4"
      style={{ background: 'rgba(255,59,92,0.04)' }}
    >
      <div className="mb-3 text-sm font-semibold text-error-400">
        {t('subscription.deleteTitle', 'Удалить подписку?')}
      </div>
      <div className="mb-4 text-xs" style={{ color: textSecondary }}>
        {t(
          'subscription.deleteWarning',
          'Подписка будет удалена безвозвратно. Все данные, устройства и настройки будут потеряны. Это действие нельзя отменить.',
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={performDelete}
          disabled={deleteLoading}
          className="flex-1 rounded-xl bg-error-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-error-600 disabled:opacity-50"
        >
          {deleteLoading
            ? t('common.processing', 'Удаление...')
            : t('subscription.confirmDelete', 'Да, удалить')}
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-dark-700 py-2.5 text-sm font-medium transition-colors hover:bg-dark-700"
          style={{ color: textSecondary }}
        >
          {t('common.cancel', 'Отмена')}
        </button>
      </div>
    </div>
  );
}
