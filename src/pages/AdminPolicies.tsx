import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi, AccessPolicy, AdminRole } from '@/api/rbac';
import { PermissionGate } from '@/components/auth/PermissionGate';
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

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const GlobeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
    />
  </svg>
);

const BoltIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  </svg>
);

// === Helpers ===

interface PolicyConditions {
  time_range?: { start: string; end: string };
  ip_whitelist?: string[];
  rate_limit?: number;
}

function parseConditions(raw: Record<string, unknown>): PolicyConditions {
  const result: PolicyConditions = {};

  if (raw.time_range && typeof raw.time_range === 'object') {
    const tr = raw.time_range as Record<string, unknown>;
    if (typeof tr.start === 'string' && typeof tr.end === 'string') {
      result.time_range = { start: tr.start, end: tr.end };
    }
  }

  if (Array.isArray(raw.ip_whitelist)) {
    result.ip_whitelist = raw.ip_whitelist.filter((ip): ip is string => typeof ip === 'string');
  }

  if (typeof raw.rate_limit === 'number') {
    result.rate_limit = raw.rate_limit;
  }

  return result;
}

// === Sub-components ===

interface EffectBadgeProps {
  effect: 'allow' | 'deny';
  className?: string;
}

function EffectBadge({ effect, className }: EffectBadgeProps) {
  const { t } = useTranslation();

  const isAllow = effect === 'allow';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
        isAllow
          ? 'border-green-500/30 bg-green-500/10 text-green-400'
          : 'border-red-500/30 bg-red-500/10 text-red-400'
      } ${className ?? ''}`}
    >
      {isAllow ? t('admin.policies.effectAllow') : t('admin.policies.effectDeny')}
    </span>
  );
}

// === Main Page ===

export default function AdminPolicies() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const {
    data: policies,
    isLoading: policiesLoading,
    error: policiesError,
  } = useQuery({
    queryKey: ['admin-policies'],
    queryFn: rbacApi.getPolicies,
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: rbacApi.getRoles,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: rbacApi.deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      setDeleteConfirm(null);
    },
    onError: () => {
      setDeleteConfirm(null);
      setFormError(t('admin.policies.errors.deleteFailed'));
    },
  });

  // Derived data
  const rolesMap = useMemo(() => {
    const map = new Map<number, AdminRole>();
    if (roles) {
      for (const role of roles) {
        map.set(role.id, role);
      }
    }
    return map;
  }, [roles]);

  const sortedPolicies = useMemo(() => {
    if (!policies) return [];
    return [...policies].sort((a, b) => b.priority - a.priority);
  }, [policies]);

  // Condition icons renderer
  const renderConditionIcons = useCallback(
    (conditions: Record<string, unknown>) => {
      const parsed = parseConditions(conditions);
      const icons: React.ReactNode[] = [];

      if (parsed.time_range) {
        icons.push(
          <span
            key="time"
            className="inline-flex items-center gap-1 rounded bg-dark-700 px-1.5 py-0.5 text-xs text-dark-300"
            title={t('admin.policies.conditions.timeRange')}
          >
            <ClockIcon />
            {parsed.time_range.start}-{parsed.time_range.end}
          </span>,
        );
      }

      if (parsed.ip_whitelist && parsed.ip_whitelist.length > 0) {
        icons.push(
          <span
            key="ip"
            className="inline-flex items-center gap-1 rounded bg-dark-700 px-1.5 py-0.5 text-xs text-dark-300"
            title={t('admin.policies.conditions.ipWhitelist')}
          >
            <GlobeIcon />
            {t('admin.policies.conditions.ipCount', { count: parsed.ip_whitelist.length })}
          </span>,
        );
      }

      if (parsed.rate_limit !== undefined) {
        icons.push(
          <span
            key="rate"
            className="inline-flex items-center gap-1 rounded bg-dark-700 px-1.5 py-0.5 text-xs text-dark-300"
            title={t('admin.policies.conditions.rateLimit')}
          >
            <BoltIcon />
            {t('admin.policies.conditions.rateValue', { count: parsed.rate_limit })}
          </span>,
        );
      }

      return icons;
    },
    [t],
  );

  const getRoleName = useCallback(
    (policy: AccessPolicy): string => {
      if (policy.role_name) return policy.role_name;
      if (policy.role_id === null) return t('admin.policies.global');
      const role = rolesMap.get(policy.role_id);
      return role?.name ?? t('admin.policies.unknownRole');
    },
    [rolesMap, t],
  );

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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.policies.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.policies.subtitle')}</p>
          </div>
        </div>
        <PermissionGate permission="roles:create">
          <button
            onClick={() => navigate('/admin/policies/create')}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
          >
            <PlusIcon />
            {t('admin.policies.createPolicy')}
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
      {sortedPolicies.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-dark-100">{sortedPolicies.length}</div>
            <div className="text-xs text-dark-400">{t('admin.policies.stats.total')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-green-400">
              {sortedPolicies.filter((p) => p.effect === 'allow').length}
            </div>
            <div className="text-xs text-dark-400">{t('admin.policies.stats.allow')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-red-400">
              {sortedPolicies.filter((p) => p.effect === 'deny').length}
            </div>
            <div className="text-xs text-dark-400">{t('admin.policies.stats.deny')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-accent-400">
              {sortedPolicies.filter((p) => p.is_active).length}
            </div>
            <div className="text-xs text-dark-400">{t('admin.policies.stats.active')}</div>
          </div>
        </div>
      )}

      {/* Policies List */}
      {policiesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : policiesError ? (
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.policies.errors.loadFailed')}</p>
        </div>
      ) : sortedPolicies.length === 0 ? (
        <div className="py-12 text-center">
          <ShieldIcon />
          <p className="mt-2 text-dark-400">{t('admin.policies.noPolicies')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPolicies.map((policy) => {
            const conditionIcons = renderConditionIcons(policy.conditions);
            const roleName = getRoleName(policy);

            return (
              <div
                key={policy.id}
                className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                  policy.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Policy name + effect badge */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-dark-100">{policy.name}</span>
                      <EffectBadge effect={policy.effect} />
                      {!policy.is_active && (
                        <span className="rounded bg-dark-600 px-1.5 py-0.5 text-xs text-dark-400">
                          {t('admin.policies.inactiveBadge')}
                        </span>
                      )}
                    </div>

                    {/* Resource + actions */}
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded bg-dark-700 px-2 py-0.5 font-mono text-xs text-accent-400">
                        {policy.resource}
                      </span>
                      <span className="text-dark-500">:</span>
                      <span className="font-mono text-xs text-dark-300">
                        {(policy.actions ?? []).join(', ')}
                      </span>
                    </div>

                    {/* Info row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                      <span>
                        {t('admin.policies.roleLabel')}: {roleName}
                      </span>
                      <span>
                        {t('admin.policies.priorityLabel')}: {policy.priority}
                      </span>
                    </div>

                    {/* Condition icons */}
                    {conditionIcons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">{conditionIcons}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-dark-700 pt-3 sm:border-0 sm:pt-0">
                    <PermissionGate permission="roles:edit">
                      <button
                        onClick={() => navigate(`/admin/policies/${policy.id}/edit`)}
                        className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100 sm:flex-none"
                        title={t('admin.policies.actions.edit')}
                      >
                        <EditIcon />
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="roles:delete">
                      <button
                        onClick={() => setDeleteConfirm(policy.id)}
                        className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-error-500/20 hover:text-error-400 sm:flex-none"
                        title={t('admin.policies.actions.delete')}
                      >
                        <TrashIcon />
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            );
          })}
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
              {t('admin.policies.confirm.title')}
            </h3>
            <p className="mb-6 text-dark-400">{t('admin.policies.confirm.text')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
              >
                {t('admin.policies.confirm.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-error-500 px-4 py-2 text-white transition-colors hover:bg-error-600 disabled:opacity-50"
              >
                {deleteMutation.isPending
                  ? t('admin.policies.confirm.deleting')
                  : t('admin.policies.confirm.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
