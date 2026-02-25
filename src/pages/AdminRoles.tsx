import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi } from '@/api/rbac';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePermissionStore } from '@/store/permissions';
import { usePlatform } from '@/platform/hooks/usePlatform';

// === Icons ===

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

const ShieldIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

// === Main Page ===

export default function AdminRoles() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const canManageRole = usePermissionStore((s) => s.canManageRole);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: rbacApi.getRoles,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: rbacApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setDeleteConfirm(null);
    },
    onError: () => {
      setDeleteConfirm(null);
      setFormError(t('admin.roles.errors.deleteFailed'));
    },
  });

  // Sorted roles by level descending
  const sortedRoles = useMemo(() => {
    if (!roles) return [];
    return [...roles].sort((a, b) => b.level - a.level);
  }, [roles]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.roles.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.roles.subtitle')}</p>
          </div>
        </div>
        <PermissionGate permission="roles:create">
          <button
            onClick={() => navigate('/admin/roles/create')}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
          >
            <PlusIcon />
            {t('admin.roles.createRole')}
          </button>
        </PermissionGate>
      </div>

      {/* Error message */}
      {formError && (
        <div className="mb-4 rounded-lg border border-error-500/30 bg-error-500/10 p-3">
          <p className="text-sm text-error-400">{formError}</p>
        </div>
      )}

      {/* Stats Overview */}
      {sortedRoles.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-dark-100">{sortedRoles.length}</div>
            <div className="text-xs text-dark-400">{t('admin.roles.stats.totalRoles')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-accent-400">
              {sortedRoles.filter((r) => r.is_active).length}
            </div>
            <div className="text-xs text-dark-400">{t('admin.roles.stats.active')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-warning-400">
              {sortedRoles.filter((r) => r.is_system).length}
            </div>
            <div className="text-xs text-dark-400">{t('admin.roles.stats.system')}</div>
          </div>
        </div>
      )}

      {/* Roles List */}
      {rolesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : rolesError ? (
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.roles.errors.loadFailed')}</p>
        </div>
      ) : sortedRoles.length === 0 ? (
        <div className="py-12 text-center">
          <ShieldIcon />
          <p className="mt-2 text-dark-400">{t('admin.roles.noRoles')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRoles.map((role) => (
            <div
              key={role.id}
              className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                role.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  {/* Role name with color badge */}
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: role.color || '#6b7280' }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-dark-100">{role.name}</span>
                    {role.is_system && (
                      <span className="rounded bg-warning-500/20 px-1.5 py-0.5 text-xs text-warning-400">
                        {t('admin.roles.systemBadge')}
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="rounded bg-dark-600 px-1.5 py-0.5 text-xs text-dark-400">
                        {t('admin.roles.inactiveBadge')}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span>
                      {t('admin.roles.levelLabel')}: {role.level}
                    </span>
                    {role.description && <span>{role.description}</span>}
                    <span>{t('admin.roles.usersCount', { count: role.user_count ?? 0 })}</span>
                    <span>
                      {t('admin.roles.permissionsCount', {
                        count: role.permissions.length,
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-dark-700 pt-3 sm:border-0 sm:pt-0">
                  <PermissionGate permission="roles:edit">
                    <button
                      onClick={() => navigate(`/admin/roles/${role.id}/edit`)}
                      disabled={role.is_system || !canManageRole(role.level)}
                      className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                      title={t('admin.roles.actions.edit')}
                    >
                      <EditIcon />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="roles:delete">
                    <button
                      onClick={() => setDeleteConfirm(role.id)}
                      disabled={role.is_system || !canManageRole(role.level)}
                      className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-error-500/20 hover:text-error-400 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                      title={t('admin.roles.actions.delete')}
                    >
                      <TrashIcon />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setDeleteConfirm(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-xl border border-dark-700 bg-dark-800 p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark-100">
              {t('admin.roles.confirm.title')}
            </h3>
            <p className="mb-6 text-dark-400">{t('admin.roles.confirm.text')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
              >
                {t('admin.roles.confirm.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-error-500 px-4 py-2 text-white transition-colors hover:bg-error-600 disabled:opacity-50"
              >
                {deleteMutation.isPending
                  ? t('admin.roles.confirm.deleting')
                  : t('admin.roles.confirm.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
