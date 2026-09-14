import { useTranslation } from 'react-i18next';
import { Card } from '@/components/data-display';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';

interface DangerZoneProps {
  busy: boolean;
  /** Подписка ещё действует — «Отменить» имеет смысл; истёкшую только удалять. */
  canCancel: boolean;
  onCancel: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

/**
 * Последняя секция вкладки «Подписка». Красное не стоит рядом с «Продлить»,
 * а каждое действие объяснено и подтверждается системным диалогом.
 */
export function DangerZone({ busy, canCancel, onCancel, onDelete }: DangerZoneProps) {
  const { t } = useTranslation();
  const confirmDestructive = useDestructiveConfirm();
  const ns = 'admin.users.detail.subscription';

  const cancel = async () => {
    const ok = await confirmDestructive(
      t(`${ns}.confirm.cancelSubscription`),
      t(`${ns}.cancel`),
      t(`${ns}.cancelTitle`),
    );
    if (ok) await onCancel();
  };

  const remove = async () => {
    const ok = await confirmDestructive(
      t(`${ns}.deleteHint`),
      t(`${ns}.deleteButton`),
      t(`${ns}.deleteTitle`),
    );
    if (ok) await onDelete();
  };

  return (
    <Card size="md" className="flex flex-col gap-3 border-error-500/25">
      <h2 className="text-lg font-semibold text-error-400">{t(`${ns}.dangerZone.title`)}</h2>
      <p className="text-sm text-dark-400">{t(`${ns}.dangerZone.description`)}</p>
      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <button type="button" onClick={cancel} disabled={busy} className="btn-danger">
            {t(`${ns}.cancelButton`)}
          </button>
        )}
        <button type="button" onClick={remove} disabled={busy} className="btn-danger">
          {t(`${ns}.deleteButton`)}
        </button>
      </div>
    </Card>
  );
}
