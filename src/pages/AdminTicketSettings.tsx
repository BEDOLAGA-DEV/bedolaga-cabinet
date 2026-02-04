import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/admin';
import { AdminBackButton } from '../components/admin';
import { useBackButton } from '../platform/hooks/useBackButton';

const SettingsIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function AdminTicketSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useBackButton(() => navigate('/admin/tickets'));

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ticket-settings'],
    queryFn: adminApi.getTicketSettings,
  });

  const [formData, setFormData] = useState({
    sla_enabled: true,
    sla_minutes: 5,
    sla_check_interval_seconds: 60,
    sla_reminder_cooldown_minutes: 15,
    support_system_mode: 'both',
    cabinet_user_notifications_enabled: true,
    cabinet_admin_notifications_enabled: true,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        sla_enabled: settings.sla_enabled,
        sla_minutes: settings.sla_minutes,
        sla_check_interval_seconds: settings.sla_check_interval_seconds,
        sla_reminder_cooldown_minutes: settings.sla_reminder_cooldown_minutes,
        support_system_mode: settings.support_system_mode,
        cabinet_user_notifications_enabled: settings.cabinet_user_notifications_enabled ?? true,
        cabinet_admin_notifications_enabled: settings.cabinet_admin_notifications_enabled ?? true,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: adminApi.updateTicketSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-settings'] });
      navigate('/admin/tickets');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
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
          <AdminBackButton to="/admin/tickets" />
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.tickets.settings')}</h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.tickets.settingsLoadError')}</p>
          <button
            onClick={() => navigate('/admin/tickets')}
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
        <AdminBackButton to="/admin/tickets" />
        <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
          <SettingsIcon />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.tickets.settings')}</h1>
          <p className="text-sm text-dark-400">{t('admin.tickets.settingsSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Support System Mode */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-dark-100">
            {t('admin.tickets.supportMode')}
          </h3>
          <select
            value={formData.support_system_mode}
            onChange={(e) => setFormData({ ...formData, support_system_mode: e.target.value })}
            className="input"
          >
            <option value="both">{t('admin.tickets.modeBoth')}</option>
            <option value="tickets">{t('admin.tickets.modeTickets')}</option>
            <option value="contact">{t('admin.tickets.modeContact')}</option>
          </select>
          <p className="mt-2 text-sm text-dark-500">{t('admin.tickets.supportModeDesc')}</p>
        </div>

        {/* Cabinet Notifications */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-dark-100">
            {t('admin.tickets.cabinetNotifications')}
          </h3>

          {/* User Notifications */}
          <div className="mb-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={formData.cabinet_user_notifications_enabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cabinet_user_notifications_enabled: e.target.checked,
                  })
                }
                className="h-5 w-5 rounded border-dark-700 bg-dark-800 text-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-dark-100">
                  {t('admin.tickets.userNotificationsEnabled')}
                </div>
                <div className="text-sm text-dark-500">
                  {t('admin.tickets.userNotificationsEnabledDesc')}
                </div>
              </div>
            </label>
          </div>

          {/* Admin Notifications */}
          <div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={formData.cabinet_admin_notifications_enabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cabinet_admin_notifications_enabled: e.target.checked,
                  })
                }
                className="h-5 w-5 rounded border-dark-700 bg-dark-800 text-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-dark-100">
                  {t('admin.tickets.adminNotificationsEnabled')}
                </div>
                <div className="text-sm text-dark-500">
                  {t('admin.tickets.adminNotificationsEnabledDesc')}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* SLA Settings */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-dark-100">
            {t('admin.tickets.slaSettings')}
          </h3>

          {/* SLA Enabled */}
          <div className="mb-6">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={formData.sla_enabled}
                onChange={(e) => setFormData({ ...formData, sla_enabled: e.target.checked })}
                className="h-5 w-5 rounded border-dark-700 bg-dark-800 text-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-offset-0"
              />
              <div>
                <div className="font-medium text-dark-100">{t('admin.tickets.slaEnabled')}</div>
                <div className="text-sm text-dark-500">{t('admin.tickets.slaEnabledDesc')}</div>
              </div>
            </label>
          </div>

          {/* SLA Minutes */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-dark-100">
              {t('admin.tickets.slaMinutes')}
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={formData.sla_minutes}
              onChange={(e) => setFormData({ ...formData, sla_minutes: parseInt(e.target.value) })}
              className="input"
              disabled={!formData.sla_enabled}
            />
            <p className="mt-1 text-xs text-dark-500">{t('admin.tickets.slaMinutesDesc')}</p>
          </div>

          {/* Check Interval */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-dark-100">
              {t('admin.tickets.checkInterval')}
            </label>
            <input
              type="number"
              min="30"
              max="600"
              value={formData.sla_check_interval_seconds}
              onChange={(e) =>
                setFormData({ ...formData, sla_check_interval_seconds: parseInt(e.target.value) })
              }
              className="input"
              disabled={!formData.sla_enabled}
            />
            <p className="mt-1 text-xs text-dark-500">{t('admin.tickets.checkIntervalDesc')}</p>
          </div>

          {/* Reminder Cooldown */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-100">
              {t('admin.tickets.reminderCooldown')}
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={formData.sla_reminder_cooldown_minutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sla_reminder_cooldown_minutes: parseInt(e.target.value),
                })
              }
              className="input"
              disabled={!formData.sla_enabled}
            />
            <p className="mt-1 text-xs text-dark-500">{t('admin.tickets.reminderCooldownDesc')}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/tickets')}
            className="btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
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
            {t('admin.tickets.settingsUpdateError')}
          </div>
        )}
      </form>
    </div>
  );
}
