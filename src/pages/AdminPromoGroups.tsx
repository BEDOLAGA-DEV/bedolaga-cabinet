import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { promocodesApi, PromoGroup } from '../api/promocodes';
import { usePlatform } from '../platform/hooks/usePlatform';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  BackIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  UsersIcon,
  TagIcon,
  BoltIcon,
} from '@/components/icons';
import { StatCard } from '@/components/stats';

export default function AdminPromoGroups() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const deleteDialogRef = useFocusTrap<HTMLDivElement>(!!deleteConfirm, {
    onEscape: () => setDeleteConfirm(null),
  });

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
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
        >
          <PlusIcon />
          {t('admin.promoGroups.addGroup')}
        </button>
      </div>

      {/* Stats */}
      {groups.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label={t('admin.promoGroups.stats.total')}
            value={groups.length}
            icon={<TagIcon className="h-5 w-5" />}
            tone="neutral"
          />
          <StatCard
            label={t('admin.promoGroups.stats.members')}
            value={groups.reduce((sum, g) => sum + g.members_count, 0)}
            icon={<UsersIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.promoGroups.stats.autoAssign')}
            value={groups.filter((g) => g.auto_assign_total_spent_kopeks).length}
            icon={<BoltIcon className="h-5 w-5" />}
            tone="warning"
          />
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
                    <TrashIcon className="h-4 w-4" />
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
          <div
            className="absolute inset-0 bg-dark-950/60"
            onClick={() => setDeleteConfirm(null)}
            aria-hidden="true"
          />
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-group-delete-title"
            tabIndex={-1}
            className="relative w-full max-w-sm rounded-xl bg-dark-800 p-6"
          >
            <h3 id="promo-group-delete-title" className="mb-2 text-lg font-semibold text-dark-100">
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
