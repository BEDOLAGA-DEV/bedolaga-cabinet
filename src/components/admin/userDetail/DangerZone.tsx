import { useTranslation } from 'react-i18next';
import { Card } from '@/components/data-display';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';

interface DangerZoneProps {
  disabled: boolean;
  /** Подписка ещё действует — «Отменить» имеет смысл; истёкшую только удалять. */
  canCancel: boolean;
  onCancel: () => Promise<void>;
  onDelete: () => Promise<void>;
}

/**
 * Последняя секция вкладки «Подписка». Красное не стоит рядом с «Продлить»,
 * а каждое действие объяснено и подтверждается системным диалогом.
 */
export function DangerZone({ disabled, canCancel, onCancel, onDelete }: DangerZoneProps) {
  const { t } = useTranslation();
  const confirmDestructive = useDestructiveConfirm();

  const cancel = async () => {
    if (
      await confirmDestructive(
        t('admin.users.detail.subscription.confirm.cancelSubscription'),
        t('admin.users.detail.subscription.cancel'),
        t('admin.users.detail.subscription.cancelTitle'),
      )
    )
      await onCancel();
  };

  const remove = async () => {
    if (
      await confirmDestructive(
        t('admin.users.detail.subscription.deleteHint'),
        t('admin.users.detail.subscription.deleteButton'),
        t('admin.users.detail.subscription.deleteTitle'),
      )
    )
      await onDelete();
  };

  return (
    <Card size="md" className="flex flex-col gap-3 border-error-500/25">
      <h2 className="text-lg font-semibold text-error-400">
        {t('admin.users.detail.subscription.dangerZone.title')}
      </h2>
      <p className="text-sm text-dark-400">
        {t('admin.users.detail.subscription.dangerZone.description')}
      </p>
      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <button type="button" onClick={cancel} disabled={disabled} className="btn-danger">
            {t('admin.users.detail.subscription.cancelButton')}
          </button>
        )}
        <button type="button" onClick={remove} disabled={disabled} className="btn-danger">
          {t('admin.users.detail.subscription.deleteButton')}…
        </button>
      </div>
    </Card>
  );
}
