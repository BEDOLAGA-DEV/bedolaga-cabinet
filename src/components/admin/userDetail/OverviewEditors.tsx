import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdateRestrictionsRequest, UserDetailResponse } from '@/api/adminUsers';
import type { PromoGroup } from '@/api/promocodes';
import { Toggle } from '@/components/admin/Toggle';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';

interface PromoGroupEditorProps {
  user: UserDetailResponse;
  promoGroups: PromoGroup[];
  busy: boolean;
  onSave: (groupId: number | null) => Promise<boolean>;
  onClose: () => void;
}

/** Смена промогруппы на месте: список групп и две кнопки. */
export function PromoGroupEditor({
  user,
  promoGroups,
  busy,
  onSave,
  onClose,
}: PromoGroupEditorProps) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState(user.promo_group ? String(user.promo_group.id) : '');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {t('admin.users.detail.overview.promoGroup')}
      </label>
      <DropdownSelect
        id={id}
        value={value}
        onChange={setValue}
        disabled={busy}
        className="min-w-[11rem]"
        options={[
          { value: '', label: t('admin.users.detail.overview.noPromoGroup') },
          ...promoGroups.map((group) => ({ value: String(group.id), label: group.name })),
        ]}
      />
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (await onSave(value ? Number(value) : null)) onClose();
        }}
        className="btn-primary px-3 py-2 text-sm"
      >
        {t('common.save')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onClose}
        className="btn-secondary px-3 py-2 text-sm"
      >
        {t('common.cancel')}
      </button>
    </div>
  );
}

interface RestrictionsEditorProps {
  user: UserDetailResponse;
  busy: boolean;
  onSave: (request: UpdateRestrictionsRequest) => Promise<boolean>;
  onClose: () => void;
}

/** Запрет пополнения и покупки с причиной — переключатели канона, не чекбоксы. */
export function RestrictionsEditor({ user, busy, onSave, onClose }: RestrictionsEditorProps) {
  const { t } = useTranslation();
  const reasonId = useId();
  const [topup, setTopup] = useState(user.restriction_topup);
  const [subscription, setSubscription] = useState(user.restriction_subscription);
  const [reason, setReason] = useState(user.restriction_reason ?? '');
  const ns = 'admin.users.detail.overview';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dark-700 bg-dark-800/60 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-dark-200">{t(`${ns}.restrictTopupFull`)}</span>
        <Toggle
          checked={topup}
          onChange={() => setTopup((value) => !value)}
          disabled={busy}
          aria-label={t(`${ns}.restrictTopupFull`)}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-dark-200">{t(`${ns}.restrictSubscriptionFull`)}</span>
        <Toggle
          checked={subscription}
          onChange={() => setSubscription((value) => !value)}
          disabled={busy}
          aria-label={t(`${ns}.restrictSubscriptionFull`)}
        />
      </div>
      <label htmlFor={reasonId} className="flex flex-col gap-1">
        <span className="text-xs text-dark-500">{t(`${ns}.restrictionReason`)}</span>
        <input
          id={reasonId}
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={255}
          disabled={busy}
          className="input py-2"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const saved = await onSave({
              restriction_topup: topup,
              restriction_subscription: subscription,
              restriction_reason: reason.trim(),
            });
            if (saved) onClose();
          }}
          className="btn-primary px-3 py-2 text-sm"
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="btn-secondary px-3 py-2 text-sm"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
