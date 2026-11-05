import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminSettingsApi } from '../../api/adminSettings';
import { SettingsTableRow } from './SettingsTableRow';

// Классические награды и ограничения редактируются через тот же API, что и системные настройки.
// Схему уровней редактируют на отдельной странице, чтобы не смешивать модели начисления.
const REFERRAL_SETTING_KEYS = [
  'REFERRAL_REWARD_SCHEME',
  'REFERRAL_MINIMUM_TOPUP_KOPEKS',
  'REFERRAL_FIRST_TOPUP_BONUS_KOPEKS',
  'REFERRAL_INVITER_BONUS_KOPEKS',
  'REFERRAL_COMMISSION_PERCENT',
  'REFERRAL_FIRST_PAYMENT_COMMISSION_PERCENT',
  'REFERRAL_RECURRING_COMMISSION_TIERS',
  'REFERRAL_MAX_COMMISSION_PAYMENTS',
] as const;

interface PartnerReferralSettingsProps {
  canEdit: boolean;
}

export function PartnerReferralSettings({ canEdit }: PartnerReferralSettingsProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settings, isPending, isError } = useQuery({
    queryKey: ['admin-referral-settings', i18n.language],
    queryFn: () => adminSettingsApi.getSettings('REFERRAL'),
  });

  const refreshSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-referral-settings'] });
    queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    queryClient.invalidateQueries({ queryKey: ['partner-settings'] });
    queryClient.invalidateQueries({ queryKey: ['referral-terms'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminSettingsApi.updateSetting(key, value),
    onSuccess: refreshSettings,
  });
  const resetMutation = useMutation({
    mutationFn: (key: string) => adminSettingsApi.resetSetting(key),
    onSuccess: refreshSettings,
  });

  const byKey = new Map(settings?.map((setting) => [setting.key, setting]) ?? []);
  const visible = REFERRAL_SETTING_KEYS.flatMap((key) => {
    const setting = byKey.get(key);
    return setting ? [setting] : [];
  });
  const busy = updateMutation.isPending || resetMutation.isPending;

  return (
    <section className="card mb-6" aria-label={t('admin.partners.advancedReferralSettings')}>
      <h3 className="mb-1 text-lg font-semibold text-dark-100">
        {t('admin.partners.advancedReferralSettings')}
      </h3>
      <p className="mb-4 text-sm text-dark-500">
        {t('admin.partners.advancedReferralSettingsDesc')}
      </p>

      {isPending && <p className="text-sm text-dark-400">{t('common.loading')}</p>}
      {isError && (
        <p role="alert" className="text-sm text-error-400">
          {t('admin.partners.settingsLoadError')}
        </p>
      )}
      {!isPending && !isError && (
        <div className="overflow-hidden rounded-xl border border-dark-700/40">
          {visible.map((setting, index) => (
            <SettingsTableRow
              key={setting.key}
              setting={setting}
              isFavorite={false}
              showFavorite={false}
              canEdit={canEdit}
              onUpdate={(value) => updateMutation.mutate({ key: setting.key, value })}
              onReset={() => resetMutation.mutate(setting.key)}
              isUpdating={busy}
              isResetting={busy}
              isLast={index === visible.length - 1}
            />
          ))}
        </div>
      )}
      {(updateMutation.isError || resetMutation.isError) && (
        <p role="alert" className="mt-3 text-sm text-error-400">
          {t('admin.partners.settingsUpdateError')}
        </p>
      )}
    </section>
  );
}
