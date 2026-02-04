import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { promocodesApi, PromoGroup } from '../api/promocodes';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

// Icons
const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

export default function AdminPromoGroups() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Query
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['admin-promo-groups'],
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: promocodesApi.deletePromoGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-groups'] });
      setDeleteConfirm(null);
    },
  });

  const groups = groupsData?.items || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.promoGroups.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.promoGroups.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/promo-groups/create')}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
        >
          <PlusIcon />
          {t('admin.promoGroups.addGroup')}
        </button>
      </div>

      {/* Stats */}
      {groups.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-dark-100">{groups.length}</div>
            <div className="text-xs text-dark-400">{t('admin.promoGroups.stats.total')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-accent-400">
              {groups.reduce((sum, g) => sum + g.members_count, 0)}
            </div>
            <div className="text-xs text-dark-400">{t('admin.promoGroups.stats.members')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-warning-400">
              {groups.filter((g) => g.auto_assign_total_spent_kopeks).length}
            </div>
            <div className="text-xs text-dark-400">{t('admin.promoGroups.stats.autoAssign')}</div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.promoGroups.noGroups')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group: PromoGroup) => (
            <div key={group.id} className="rounded-xl border border-dark-700 bg-dark-800 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-medium text-dark-100">{group.name}</h3>
                    {group.is_default && (
                      <span className="rounded bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
                        {t('admin.promoGroups.default')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    {group.server_discount_percent > 0 && (
                      <span>
                        {t('admin.promoGroups.servers')}: -{group.server_discount_percent}%
                      </span>
                    )}
                    {group.traffic_discount_percent > 0 && (
                      <span>
                        {t('admin.promoGroups.traffic')}: -{group.traffic_discount_percent}%
                      </span>
                    )}
                    {group.device_discount_percent > 0 && (
                      <span>
                        {t('admin.promoGroups.devices')}: -{group.device_discount_percent}%
                      </span>
                    )}
                    {group.period_discounts &&
                      Object.keys(group.period_discounts).length > 0 &&
                      Object.entries(group.period_discounts).map(([days, percent]) => (
                        <span key={days} className="text-accent-400">
                          {t('admin.promoGroups.daysShort', { days })}: -{percent}%
                        </span>
                      ))}
                    {group.auto_assign_total_spent_kopeks &&
                      group.auto_assign_total_spent_kopeks > 0 && (
                        <span className="text-warning-400">
                          {t('admin.promoGroups.autoFrom', {
                            amount: group.auto_assign_total_spent_kopeks / 100,
                          })}
                        </span>
                      )}
                    <span className="flex items-center gap-1">
                      <UsersIcon />
                      {t('admin.promoGroups.members', { count: group.members_count })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/promo-groups/${group.id}/edit`)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                    title={t('admin.promoGroups.actions.edit')}
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(group.id)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-error-500/20 hover:text-error-400"
                    title={t('admin.promoGroups.actions.delete')}
                    disabled={group.is_default}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-dark-800 p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark-100">
              {t('admin.promoGroups.confirm.title')}
            </h3>
            <p className="mb-6 text-dark-400">{t('admin.promoGroups.confirm.text')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
              >
                {t('admin.promoGroups.confirm.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="rounded-lg bg-error-500 px-4 py-2 text-white transition-colors hover:bg-error-600"
              >
                {t('admin.promoGroups.confirm.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
