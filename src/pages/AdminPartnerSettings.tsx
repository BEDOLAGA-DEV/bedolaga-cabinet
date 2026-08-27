import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi } from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { toNumber } from '../utils/inputHelpers';
import { SettingsIcon } from '@/components/icons';

type NumberOrEmpty = number | '';

export default function AdminPartnerSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['partner-settings'],
    queryFn: partnerApi.getPartnerSettings,
  });

  const [formData, setFormData] = useState<{
    referral_program_enabled: boolean;
    partner_section_visible: boolean;
    withdrawal_enabled: boolean;
    withdrawal_min_amount_kopeks: NumberOrEmpty;
    withdrawal_cooldown_days: NumberOrEmpty;
    withdrawal_requisites_text: string;
  }>({
    referral_program_enabled: true,
    partner_section_visible: true,
    withdrawal_enabled: false,
    withdrawal_min_amount_kopeks: 100000,
    withdrawal_cooldown_days: 30,
    withdrawal_requisites_text: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        referral_program_enabled: settings.referral_program_enabled,
        partner_section_visible: settings.partner_section_visible,
        withdrawal_enabled: settings.withdrawal_enabled,
        withdrawal_min_amount_kopeks: settings.withdrawal_min_amount_kopeks,
        withdrawal_cooldown_days: settings.withdrawal_cooldown_days,
        withdrawal_requisites_text: settings.withdrawal_requisites_text,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: partnerApi.updatePartnerSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-settings'] });
      queryClient.invalidateQueries({ queryKey: ['referral-terms'] });
      navigate('/admin/partners');
    },
  });

  // Validation
  const isMinAmountValid =
    formData.withdrawal_min_amount_kopeks !== '' &&
    formData.withdrawal_min_amount_kopeks >= 0 &&
    formData.withdrawal_min_amount_kopeks <= 100_000_000;
  const isCooldownValid =
    formData.withdrawal_cooldown_days !== '' &&
    formData.withdrawal_cooldown_days >= 0 &&
    formData.withdrawal_cooldown_days <= 365;
  const isValid = !formData.withdrawal_enabled || (isMinAmountValid && isCooldownValid);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isValid) return;
    updateMutation.mutate({
      ...formData,
      withdrawal_min_amount_kopeks: toNumber(formData.withdrawal_min_amount_kopeks, 100000),
      withdrawal_cooldown_days: toNumber(formData.withdrawal_cooldown_days, 30),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/partners" />
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.partners.settings')}</h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.partners.settingsLoadError')}</p>
          <button
            onClick={() => navigate('/admin/partners')}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/partners" />
        <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.partners.settings')}</h1>
          <p className="text-sm text-dark-400">{t('admin.partners.settingsSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Referral Program Section */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-dark-100">
            {t('admin.partners.settingsSection.referralProgram')}
          </h3>

          {/* Program Enabled */}
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={formData.referral_program_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, referral_program_enabled: e.target.checked })
                }
                className="h-5 w-5 rounded border-dark-700 bg-dark-800 text-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-dark-100">
                  {t('admin.partners.settingsFields.programEnabled')}
                </div>
                <div className="text-sm text-dark-500">
                  {t('admin.partners.settingsFields.programEnabledDesc')}
                </div>
              </div>
            </label>
          </div>

          {/* Partner Section Visible */}
          <div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={formData.partner_section_visible}
                onChange={(e) =>
                  setFormData({ ...formData, partner_section_visible: e.target.checked })
                }
                className="h-5 w-5 rounded border-dark-700 bg-dark-800 text-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-dark-100">
                  {t('admin.partners.settingsFields.partnerVisible')}
                </div>
                <div className="text-sm text-dark-500">
                  {t('admin.partners.settingsFields.partnerVisibleDesc')}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Withdrawal Settings Section */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-dark-100">
            {t('admin.partners.settingsSection.withdrawalSettings')}
          </h3>

          {/* Withdrawal Enabled */}
          <div className="mb-6">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={formData.withdrawal_enabled}
                onChange={(e) => setFormData({ ...formData, withdrawal_enabled: e.target.checked })}
                className="h-5 w-5 rounded border-dark-700 bg-dark-800 text-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-dark-100">
                  {t('admin.partners.settingsFields.withdrawalEnabled')}
                </div>
                <div className="text-sm text-dark-500">
                  {t('admin.partners.settingsFields.withdrawalEnabledDesc')}
                </div>
              </div>
            </label>
          </div>

          {/* Min Amount */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.partners.settingsFields.minAmount')}
            </label>
            <input
              type="number"
              min={0}
              max={100000000}
              value={formData.withdrawal_min_amount_kopeks}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '')
                  return setFormData({ ...formData, withdrawal_min_amount_kopeks: '' });
                const num = parseInt(val);
                if (!isNaN(num)) setFormData({ ...formData, withdrawal_min_amount_kopeks: num });
              }}
              className="input"
              disabled={!formData.withdrawal_enabled}
            />
            <p className="mt-1 text-xs text-dark-500">
              {t('admin.partners.settingsFields.minAmountDesc')}
            </p>
          </div>

          {/* Cooldown Days */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.partners.settingsFields.cooldownDays')}
            </label>
            <input
              type="number"
              min={0}
              max={365}
              value={formData.withdrawal_cooldown_days}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') return setFormData({ ...formData, withdrawal_cooldown_days: '' });
                const num = parseInt(val);
                if (!isNaN(num)) setFormData({ ...formData, withdrawal_cooldown_days: num });
              }}
              className="input"
              disabled={!formData.withdrawal_enabled}
            />
            <p className="mt-1 text-xs text-dark-500">
              {t('admin.partners.settingsFields.cooldownDaysDesc')}
            </p>
          </div>

          {/* Requisites Text */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.partners.settingsFields.requisitesText')}
            </label>
            <textarea
              value={formData.withdrawal_requisites_text}
              onChange={(e) =>
                setFormData({ ...formData, withdrawal_requisites_text: e.target.value })
              }
              className="input min-h-[80px] w-full"
              maxLength={2000}
              disabled={!formData.withdrawal_enabled}
              placeholder={t('admin.partners.settingsFields.requisitesTextPlaceholder')}
            />
            <p className="mt-1 text-xs text-dark-500">
              {t('admin.partners.settingsFields.requisitesTextDesc')}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/partners')}
            className="btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={!isValid || updateMutation.isPending}
            className="btn-primary"
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('common.saving')}
              </span>
            ) : (
              t('common.save')
            )}
          </button>
        </div>

        {updateMutation.isError && (
          <div className="rounded-lg border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
            {t('admin.partners.settingsUpdateError')}
          </div>
        )}
      </form>
    </div>
  );
}
