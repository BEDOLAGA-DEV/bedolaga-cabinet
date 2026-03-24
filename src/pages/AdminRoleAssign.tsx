import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi, type AdminRole, type AssignRolePayload } from '@/api/rbac';
import { adminUsersApi, type UserListItem } from '@/api/adminUsers';
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

const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'h-4 w-4'}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const UserPlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
    />
  </svg>
);

// === Constants ===

const PAGE_SIZE = 10;
const SUPERADMIN_LEVEL = 999;

// === Sub-components ===

interface UserSearchDropdownProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectUser: (user: UserListItem) => void;
  selectedUser: UserListItem | null;
  onClearUser: () => void;
}

function UserSearchDropdown({
  searchQuery,
  onSearchChange,
  onSelectUser,
  selectedUser,
  onClearUser,
}: UserSearchDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['admin-user-search', searchQuery],
    queryFn: () => adminUsersApi.getUsers({ search: searchQuery, limit: 10 }),
    enabled: searchQuery.length >= 2 && !selectedUser,
    staleTime: 30_000,
  });

  const handleSelect = useCallback(
    (user: UserListItem) => {
      onSelectUser(user);
      setIsOpen(false);
    },
    [onSelectUser],
  );

  if (selectedUser) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-900 px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-medium text-white">
          {selectedUser.first_name?.[0] || selectedUser.username?.[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm text-dark-100">{selectedUser.full_name}</span>
          {selectedUser.username && (
            <span className="ml-1.5 text-xs text-dark-500">@{selectedUser.username}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClearUser}
          className="shrink-0 text-dark-400 transition-colors hover:text-dark-200"
          aria-label={t('admin.roleAssign.clearUser')}
        >
          <XCircleIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (searchQuery.length >= 2) setIsOpen(true);
          }}
          placeholder={t('admin.roleAssign.searchPlaceholder')}
          className="w-full rounded-lg border border-dark-600 bg-dark-900 py-2 pl-10 pr-3 text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
          <SearchIcon />
        </div>
      </div>

      {isOpen && searchQuery.length >= 2 && (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-dark-600 bg-dark-800 shadow-xl">
            {searching ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              </div>
            ) : !searchResults || searchResults.users.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-dark-400">
                {t('admin.roleAssign.noUsersFound')}
              </div>
            ) : (
              searchResults.users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-dark-700"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-medium text-white">
                    {user.first_name?.[0] || user.username?.[0] || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-dark-100">
                      {user.full_name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-dark-400">
                      {user.username && <span>@{user.username}</span>}
                      <span>ID: {user.telegram_id}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface RoleBadgeProps {
  name: string;
  color: string | null;
}

function RoleBadge({ name, color }: RoleBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        borderColor: color ? `${color}40` : undefined,
        backgroundColor: color ? `${color}20` : undefined,
        color: color || undefined,
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color || '#6b7280' }}
        aria-hidden="true"
      />
      {name}
    </span>
  );
}

// === Main Page ===

export default function AdminRoleAssign() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const canManageRole = usePermissionStore((s) => s.canManageRole);

  // Assign form state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);

  // Revoke confirm
  const [revokeConfirm, setRevokeConfirm] = useState<number | null>(null);

  // Queries
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: rbacApi.getRoles,
  });

  // Fetch assignments for each role in parallel, then flatten
  const { data: allAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['admin-role-assignments', roles?.map((r) => r.id)],
    queryFn: async () => {
      if (!roles || roles.length === 0) return [];
      const results = await Promise.all(
        roles.map((role) =>
          rbacApi.getRoleUsers(role.id).then((assignments) =>
            assignments.map((a) => ({
              ...a,
              role_color: role.color,
              role_level: role.level,
            })),
          ),
        ),
      );
      return results.flat();
    },
    enabled: !!roles && roles.length > 0,
  });

  // Available roles filtered by canManageRole (superadmin excluded — env-only)
  const assignableRoles = useMemo(() => {
    if (!roles) return [];
    return roles.filter((r) => r.is_active && r.level < SUPERADMIN_LEVEL && canManageRole(r.level));
  }, [roles, canManageRole]);

  // Roles map for quick lookup
  const rolesMap = useMemo(() => {
    if (!roles) return new Map<number, AdminRole>();
    return new Map(roles.map((r) => [r.id, r]));
  }, [roles]);

  // Paginated assignments sorted by assigned_at descending
  const sortedAssignments = useMemo(() => {
    if (!allAssignments) return [];
    return [...allAssignments].sort(
      (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime(),
    );
  }, [allAssignments]);

  const totalPages = Math.ceil(sortedAssignments.length / PAGE_SIZE);
  const paginatedAssignments = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedAssignments.slice(start, start + PAGE_SIZE);
  }, [sortedAssignments, page]);

  // Mutations
  const assignMutation = useMutation({
    mutationFn: (payload: AssignRolePayload) => rbacApi.assignRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setSelectedUser(null);
      setSearchQuery('');
      setSelectedRoleId(null);
      setExpiresAt('');
      setFormError(null);
      setFormSuccess(t('admin.roleAssign.assignSuccess'));
      setTimeout(() => setFormSuccess(null), 3000);
    },
    onError: () => {
      setFormError(t('admin.roleAssign.errors.assignFailed'));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: rbacApi.revokeRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setRevokeConfirm(null);
    },
    onError: () => {
      setRevokeConfirm(null);
      setFormError(t('admin.roleAssign.errors.revokeFailed'));
    },
  });

  // Handlers
  const handleSelectUser = useCallback((user: UserListItem) => {
    setSelectedUser(user);
    setSearchQuery('');
    setFormError(null);
    setFormSuccess(null);
  }, []);

  const handleClearUser = useCallback(() => {
    setSelectedUser(null);
    setSearchQuery('');
  }, []);

  const handleAssign = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setFormSuccess(null);

      if (!selectedUser) {
        setFormError(t('admin.roleAssign.errors.userRequired'));
        return;
      }
      if (!selectedRoleId) {
        setFormError(t('admin.roleAssign.errors.roleRequired'));
        return;
      }

      const payload: AssignRolePayload = {
        user_id: selectedUser.id,
        role_id: selectedRoleId,
        expires_at: expiresAt || null,
      };

      assignMutation.mutate(payload);
    },
    [selectedUser, selectedRoleId, expiresAt, assignMutation, t],
  );

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const isExpired = useCallback((expiresAtStr: string | null) => {
    if (!expiresAtStr) return false;
    return new Date(expiresAtStr).getTime() < Date.now();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        {!capabilities.hasBackButton && (
          <button
            onClick={() => navigate('/admin')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.roleAssign.title')}</h1>
          <p className="text-sm text-dark-400">{t('admin.roleAssign.subtitle')}</p>
        </div>
      </div>

      {/* Assign Section */}
      <PermissionGate permission="roles:assign">
        <div className="mb-6 rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-dark-100">
            <UserPlusIcon />
            {t('admin.roleAssign.assignSection')}
          </h2>

          <form onSubmit={handleAssign} className="space-y-4">
            {/* User search */}
            <div>
              <label className="mb-1 block text-sm font-medium text-dark-200">
                {t('admin.roleAssign.userLabel')}
              </label>
              <UserSearchDropdown
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectUser={handleSelectUser}
                selectedUser={selectedUser}
                onClearUser={handleClearUser}
              />
            </div>

            {/* Role dropdown + Expiry in row */}
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* Role dropdown */}
              <div className="flex-1">
                <label
                  htmlFor="assign-role"
                  className="mb-1 block text-sm font-medium text-dark-200"
                >
                  {t('admin.roleAssign.roleLabel')}
                </label>
                <div className="relative">
                  <select
                    id="assign-role"
                    value={selectedRoleId ?? ''}
                    onChange={(e) =>
                      setSelectedRoleId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full appearance-none rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 pr-8 text-dark-100 outline-none transition-colors focus:border-accent-500"
                  >
                    <option value="">{t('admin.roleAssign.selectRole')}</option>
                    {assignableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} (L{role.level})
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
                </div>
              </div>

              {/* Expiry date */}
              <div className="flex-1">
                <label
                  htmlFor="assign-expires"
                  className="mb-1 block text-sm font-medium text-dark-200"
                >
                  {t('admin.roleAssign.expiresLabel')}
                </label>
                <input
                  id="assign-expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none transition-colors [color-scheme:dark] focus:border-accent-500"
                />
                <p className="mt-1 text-xs text-dark-500">{t('admin.roleAssign.expiresHint')}</p>
              </div>
            </div>

            {/* Error / Success */}
            {formError && <p className="text-sm text-error-400">{formError}</p>}
            {formSuccess && <p className="text-sm text-success-400">{formSuccess}</p>}

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={assignMutation.isPending || !selectedUser || !selectedRoleId}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-2 text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assignMutation.isPending
                  ? t('admin.roleAssign.assigning')
                  : t('admin.roleAssign.assignButton')}
              </button>
            </div>
          </form>
        </div>
      </PermissionGate>

      {/* Current Assignments Table */}
      <div className="rounded-xl border border-dark-700 bg-dark-800">
        <div className="border-b border-dark-700 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-dark-100">
            {t('admin.roleAssign.currentAssignments')}
          </h2>
          {sortedAssignments.length > 0 && (
            <p className="text-xs text-dark-400">
              {t('admin.roleAssign.totalAssignments', { count: sortedAssignments.length })}
            </p>
          )}
        </div>

        {rolesLoading || assignmentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : sortedAssignments.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-dark-400">{t('admin.roleAssign.noAssignments')}</p>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden border-b border-dark-700 px-4 py-2.5 sm:grid sm:grid-cols-12 sm:gap-4 sm:px-5">
              <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.roleAssign.table.user')}
              </div>
              <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.roleAssign.table.role')}
              </div>
              <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.roleAssign.table.assignedBy')}
              </div>
              <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.roleAssign.table.assignedAt')}
              </div>
              <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.roleAssign.table.expires')}
              </div>
              <div className="col-span-1 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.roleAssign.table.actions')}
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-dark-700/50">
              {paginatedAssignments.map((assignment) => {
                const role = rolesMap.get(assignment.role_id);
                const canRevoke = role ? canManageRole(role.level) : false;
                const expired = isExpired(assignment.expires_at);

                return (
                  <div
                    key={assignment.id}
                    className={`px-4 py-3 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4 sm:px-5 ${
                      expired ? 'opacity-50' : ''
                    }`}
                  >
                    {/* User */}
                    <div className="col-span-3 mb-2 flex items-center gap-2.5 sm:mb-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-medium text-white">
                        {assignment.user_first_name?.[0] || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-dark-100">
                          {assignment.user_first_name || t('admin.roleAssign.unknownUser')}
                        </div>
                        <div className="truncate text-xs text-dark-500">
                          {assignment.user_email ||
                            (assignment.user_telegram_id
                              ? `TG: ${assignment.user_telegram_id}`
                              : `ID: ${assignment.user_id}`)}
                        </div>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="col-span-2 mb-2 sm:mb-0">
                      <span className="mr-1.5 text-xs text-dark-500 sm:hidden">
                        {t('admin.roleAssign.table.role')}:
                      </span>
                      <RoleBadge name={assignment.role_name} color={assignment.role_color} />
                    </div>

                    {/* Assigned by */}
                    <div className="col-span-2 mb-2 text-sm text-dark-400 sm:mb-0">
                      <span className="mr-1.5 text-xs text-dark-500 sm:hidden">
                        {t('admin.roleAssign.table.assignedBy')}:
                      </span>
                      {assignment.assigned_by
                        ? `#${assignment.assigned_by}`
                        : t('admin.roleAssign.system')}
                    </div>

                    {/* Assigned at */}
                    <div className="col-span-2 mb-2 text-sm text-dark-400 sm:mb-0">
                      <span className="mr-1.5 text-xs text-dark-500 sm:hidden">
                        {t('admin.roleAssign.table.assignedAt')}:
                      </span>
                      {formatDate(assignment.assigned_at)}
                    </div>

                    {/* Expires */}
                    <div className="col-span-2 mb-2 sm:mb-0">
                      <span className="mr-1.5 text-xs text-dark-500 sm:hidden">
                        {t('admin.roleAssign.table.expires')}:
                      </span>
                      {assignment.expires_at ? (
                        <span
                          className={`text-sm ${expired ? 'text-error-400' : 'text-warning-400'}`}
                        >
                          {formatDate(assignment.expires_at)}
                          {expired && (
                            <span className="ml-1 text-xs">({t('admin.roleAssign.expired')})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-dark-500">
                          {t('admin.roleAssign.permanent')}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end sm:justify-start">
                      {assignment.role_level >= SUPERADMIN_LEVEL ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-dark-500"
                          title={t('admin.roleAssign.envManaged')}
                        >
                          ENV
                        </span>
                      ) : (
                        <PermissionGate permission="roles:assign">
                          <button
                            onClick={() => setRevokeConfirm(assignment.id)}
                            disabled={!canRevoke}
                            className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-error-500/20 hover:text-error-400 disabled:cursor-not-allowed disabled:opacity-40"
                            title={t('admin.roleAssign.revoke')}
                            aria-label={t('admin.roleAssign.revokeAriaLabel', {
                              user: assignment.user_first_name || assignment.user_id,
                              role: assignment.role_name,
                            })}
                          >
                            <XCircleIcon />
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-dark-700 px-4 py-3 sm:px-5">
                <div className="text-sm text-dark-400">
                  {t('admin.roleAssign.pagination.showing', {
                    from: page * PAGE_SIZE + 1,
                    to: Math.min((page + 1) * PAGE_SIZE, sortedAssignments.length),
                    total: sortedAssignments.length,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
                    aria-label={t('admin.roleAssign.pagination.prev')}
                  >
                    <ChevronLeftIcon />
                  </button>
                  <span className="px-3 py-2 text-sm text-dark-300">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
                    aria-label={t('admin.roleAssign.pagination.next')}
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Revoke Confirmation */}
      {revokeConfirm !== null && (
        <div className="mt-4 overflow-hidden rounded-xl border border-error-500/30 bg-dark-800">
          <div className="border-b border-error-500/20 bg-error-500/5 px-5 py-4">
            <h3 className="text-sm font-semibold text-error-400">
              {t('admin.roleAssign.confirm.title')}
            </h3>
            <p className="mt-1 text-sm text-dark-400">{t('admin.roleAssign.confirm.text')}</p>
          </div>
          <div className="flex items-center justify-end gap-3 px-5 py-3">
            <button
              onClick={() => setRevokeConfirm(null)}
              className="rounded-lg px-4 py-2 text-sm text-dark-300 transition-colors hover:text-dark-100"
            >
              {t('admin.roleAssign.confirm.cancel')}
            </button>
            <button
              onClick={() => revokeMutation.mutate(revokeConfirm)}
              disabled={revokeMutation.isPending}
              className="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-600 disabled:opacity-50"
            >
              {revokeMutation.isPending
                ? t('admin.roleAssign.confirm.revoking')
                : t('admin.roleAssign.confirm.revoke')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
