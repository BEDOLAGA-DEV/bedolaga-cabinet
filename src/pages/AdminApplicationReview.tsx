import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi, type AdminPartnerApplicationItem } from '../api/partners';
import { AdminBackButton } from '../components/admin';

export default function AdminApplicationReview() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [commission, setCommission] = useState('10');
  const [rejectComment, setRejectComment] = useState('');

  // Try to get application from navigate state, fallback to fetching
  const passedApp = (location.state as { application?: AdminPartnerApplicationItem } | null)
    ?.application;

  const { data: fetchedApps } = useQuery({
    queryKey: ['admin-partner-applications'],
    queryFn: () => partnerApi.getApplications({ status: 'pending' }),
    enabled: !passedApp && !!id,
  });

  const app = passedApp ?? fetchedApps?.items.find((a) => a.id === Number(id));

  const approveMutation = useMutation({
    mutationFn: ({ appId, commissionPercent }: { appId: number; commissionPercent: number }) =>
      partnerApi.approveApplication(appId, { commission_percent: commissionPercent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partner-stats'] });
      navigate('/admin/partners');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ appId, comment }: { appId: number; comment?: string }) =>
      partnerApi.rejectApplication(appId, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partner-stats'] });
      navigate('/admin/partners');
    },
  });

  if (!app) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/partners" />
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.partners.approveDialog.title')}
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  const displayName = app.first_name || app.username || `#${app.user_id}`;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/partners" />
        <div>
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.partners.actions.review')}
          </h1>
          <p className="text-sm text-dark-400">{displayName}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Application Details */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h3 className="mb-4 font-medium text-dark-200">
            {t('admin.partners.tabs.applications')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-dark-100">{displayName}</span>
                  {app.username && <span className="text-sm text-dark-500">@{app.username}</span>}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-dark-400">
              {app.company_name && (
                <div className="rounded-lg bg-dark-700/50 p-3">
                  <span className="text-dark-500">
                    {t('admin.partners.applicationFields.companyName')}:
                  </span>{' '}
                  <span className="text-dark-200">{app.company_name}</span>
                </div>
              )}
              {app.website_url && (
                <div className="rounded-lg bg-dark-700/50 p-3">
                  <span className="text-dark-500">
                    {t('admin.partners.applicationFields.website')}:
                  </span>{' '}
                  <span className="text-dark-200">{app.website_url}</span>
                </div>
              )}
              {app.telegram_channel && (
                <div className="rounded-lg bg-dark-700/50 p-3">
                  <span className="text-dark-500">
                    {t('admin.partners.applicationFields.channel')}:
                  </span>{' '}
                  <span className="text-dark-200">{app.telegram_channel}</span>
                </div>
              )}
              {app.description && (
                <div className="rounded-lg bg-dark-700/50 p-3">
                  <span className="text-dark-500">
                    {t('admin.partners.applicationFields.description')}:
                  </span>{' '}
                  <span className="text-dark-200">{app.description}</span>
                </div>
              )}
              {app.expected_monthly_referrals != null && (
                <div className="rounded-lg bg-dark-700/50 p-3">
                  <span className="text-dark-500">
                    {t('admin.partners.applicationFields.expectedReferrals')}:
                  </span>{' '}
                  <span className="text-dark-200">{app.expected_monthly_referrals}</span>
                </div>
              )}
              {app.desired_commission_percent != null && (
                <div className="rounded-lg bg-dark-700/50 p-3">
                  <span className="text-dark-500">
                    {t('admin.partners.applicationFields.desiredCommission')}:
                  </span>{' '}
                  <span className="text-dark-200">{app.desired_commission_percent}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Approve Section */}
        <div className="rounded-xl border border-success-500/30 bg-dark-800 p-4">
          <h3 className="mb-2 text-lg font-semibold text-dark-100">
            {t('admin.partners.approveDialog.title')}
          </h3>
          <p className="mb-4 text-sm text-dark-400">
            {t('admin.partners.approveDialog.description', { name: displayName })}
          </p>
          <label className="mb-1 block text-sm font-medium text-dark-300">
            {t('admin.partners.approveDialog.commissionLabel')}
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="mb-4 w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
            placeholder="10"
          />
          <button
            onClick={() => {
              const val = Number(commission);
              if (val >= 1 && val <= 100) {
                approveMutation.mutate({ appId: app.id, commissionPercent: val });
              }
            }}
            disabled={
              approveMutation.isPending ||
              !commission ||
              Number(commission) < 1 ||
              Number(commission) > 100
            }
            className="w-full rounded-lg bg-success-500 px-4 py-3 font-medium text-white transition-colors hover:bg-success-600 disabled:opacity-50"
          >
            {approveMutation.isPending ? t('common.saving') : t('admin.partners.actions.approve')}
          </button>
        </div>

        {approveMutation.isError && (
          <div className="rounded-lg bg-error-500/10 p-3 text-sm text-error-400">
            {t('common.error')}
          </div>
        )}

        {/* Reject Section */}
        <div className="rounded-xl border border-error-500/30 bg-dark-800 p-4">
          <h3 className="mb-2 text-lg font-semibold text-dark-100">
            {t('admin.partners.rejectDialog.title')}
          </h3>
          <p className="mb-4 text-sm text-dark-400">
            {t('admin.partners.rejectDialog.description', { name: displayName })}
          </p>
          <label className="mb-1 block text-sm font-medium text-dark-300">
            {t('admin.partners.rejectDialog.commentLabel')}
          </label>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="mb-4 w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
            rows={3}
            placeholder={t('admin.partners.rejectDialog.commentPlaceholder')}
          />
          <button
            onClick={() =>
              rejectMutation.mutate({
                appId: app.id,
                comment: rejectComment || undefined,
              })
            }
            disabled={rejectMutation.isPending}
            className="w-full rounded-lg bg-error-500 px-4 py-3 font-medium text-white transition-colors hover:bg-error-600 disabled:opacity-50"
          >
            {rejectMutation.isPending ? t('common.saving') : t('admin.partners.actions.reject')}
          </button>

          {rejectMutation.isError && (
            <div className="mt-4 rounded-lg bg-error-500/10 p-3 text-sm text-error-400">
              {t('common.error')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
