import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi, PermissionSection, CreateRolePayload, UpdateRolePayload } from '@/api/rbac';
import { AdminBackButton } from '@/components/admin';

// === Icons ===

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

// === Constants ===

const ROLE_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6b7280',
];

const PRESETS: Record<string, string[]> = {
  moderator: ['users:read', 'users:edit', 'users:block', 'tickets:*', 'ban_system:*'],
  marketer: [
    'campaigns:*',
    'broadcasts:*',
    'promocodes:*',
    'promo_offers:*',
    'promo_groups:*',
    'stats:read',
    'pinned_messages:*',
    'wheel:*',
  ],
  support: ['tickets:read', 'tickets:reply', 'users:read'],
};

// === Types ===

interface RoleFormData {
  name: string;
  description: string;
  level: number;
  color: string;
  permissions: string[];
}

const INITIAL_FORM: RoleFormData = {
  name: '',
  description: '',
  level: 50,
  color: ROLE_COLORS[0],
  permissions: [],
};

// === Sub-components ===

interface PermissionMatrixProps {
  registry: PermissionSection[];
  selectedPermissions: string[];
  onToggle: (perm: string) => void;
  onToggleSection: (section: string, actions: string[]) => void;
}

function PermissionMatrix({
  registry,
  selectedPermissions,
  onToggle,
  onToggleSection,
}: PermissionMatrixProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const isSectionFullySelected = useCallback(
    (section: string, actions: string[]) => {
      return actions.every((action) => {
        const perm = `${section}:${action}`;
        return selectedPermissions.includes(perm) || selectedPermissions.includes(`${section}:*`);
      });
    },
    [selectedPermissions],
  );

  const isSectionPartiallySelected = useCallback(
    (section: string, actions: string[]) => {
      const hasAny = actions.some((action) => {
        const perm = `${section}:${action}`;
        return selectedPermissions.includes(perm) || selectedPermissions.includes(`${section}:*`);
      });
      return hasAny && !isSectionFullySelected(section, actions);
    },
    [selectedPermissions, isSectionFullySelected],
  );

  const isPermSelected = useCallback(
    (section: string, action: string) => {
      const perm = `${section}:${action}`;
      return selectedPermissions.includes(perm) || selectedPermissions.includes(`${section}:*`);
    },
    [selectedPermissions],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-dark-200">
        {t('admin.roles.form.permissions')}
      </label>
      <div className="space-y-1 rounded-lg border border-dark-600 bg-dark-900/50 p-2">
        {registry.map((section) => {
          const isExpanded = expanded[section.section] ?? false;
          const allSelected = isSectionFullySelected(section.section, section.actions);
          const partialSelected = isSectionPartiallySelected(section.section, section.actions);

          return (
            <div
              key={section.section}
              className="rounded-lg border border-dark-700/50 bg-dark-800/30"
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onToggleSection(section.section, section.actions)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    allSelected
                      ? 'border-accent-500 bg-accent-500'
                      : partialSelected
                        ? 'border-accent-500 bg-accent-500/40'
                        : 'border-dark-500 hover:border-dark-400'
                  }`}
                  aria-label={t('admin.roles.form.toggleSection', { section: section.section })}
                >
                  {(allSelected || partialSelected) && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      {allSelected ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      )}
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpand(section.section)}
                  className="flex flex-1 items-center justify-between"
                >
                  <span className="text-sm font-medium text-dark-200">
                    {t(`admin.roles.form.permissionSections.${section.section}`, section.section)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-500">
                      {section.actions.filter((a) => isPermSelected(section.section, a)).length}/
                      {section.actions.length}
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 text-dark-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-dark-700/50 px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {section.actions.map((action) => {
                      const perm = `${section.section}:${action}`;
                      const selected = isPermSelected(section.section, action);

                      return (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => onToggle(perm)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? 'bg-accent-500/20 text-accent-400'
                              : 'bg-dark-700/50 text-dark-400 hover:bg-dark-700 hover:text-dark-300'
                          }`}
                          aria-pressed={selected}
                        >
                          {t(`admin.roles.form.permissionActions.${action}`, action)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === Main Page ===

export default function AdminRoleEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState<RoleFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch role for editing
  const { isLoading: isLoadingRole } = useQuery({
    queryKey: ['admin-role', id],
    queryFn: () => rbacApi.getRoles(),
    enabled: isEdit,
    select: useCallback(
      (roles: import('@/api/rbac').AdminRole[]) => {
        const role = roles.find((r) => r.id === Number(id));
        if (role) {
          setFormData({
            name: role.name,
            description: role.description || '',
            level: role.level,
            color: role.color || ROLE_COLORS[0],
            permissions: [...role.permissions],
          });
        }
        return role;
      },
      [id],
    ),
  });

  const { data: permissionRegistry } = useQuery({
    queryKey: ['admin-permission-registry'],
    queryFn: rbacApi.getPermissionRegistry,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateRolePayload) => rbacApi.createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      navigate('/admin/roles');
    },
    onError: () => {
      setFormError(t('admin.roles.errors.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ roleId, payload }: { roleId: number; payload: UpdateRolePayload }) =>
      rbacApi.updateRole(roleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      navigate('/admin/roles');
    },
    onError: () => {
      setFormError(t('admin.roles.errors.updateFailed'));
    },
  });

  // Handlers
  const handleTogglePermission = useCallback((perm: string) => {
    setFormData((prev) => {
      const has = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: has ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm],
      };
    });
  }, []);

  const handleToggleSection = useCallback((section: string, actions: string[]) => {
    setFormData((prev) => {
      const allPerms = actions.map((a) => `${section}:${a}`);
      const allSelected = allPerms.every(
        (p) => prev.permissions.includes(p) || prev.permissions.includes(`${section}:*`),
      );

      if (allSelected) {
        const sectionPerms = new Set([...allPerms, `${section}:*`]);
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => !sectionPerms.has(p)),
        };
      }

      const withoutSection = prev.permissions.filter((p) => !p.startsWith(`${section}:`));
      return {
        ...prev,
        permissions: [...withoutSection, `${section}:*`],
      };
    });
  }, []);

  const handleApplyPreset = useCallback((presetKey: string) => {
    const presetPerms = PRESETS[presetKey];
    if (!presetPerms) return;
    setFormData((prev) => ({
      ...prev,
      permissions: [...presetPerms],
    }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!formData.name.trim()) {
        setFormError(t('admin.roles.errors.nameRequired'));
        return;
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        level: formData.level,
        permissions: formData.permissions,
        color: formData.color,
      };

      if (isEdit) {
        updateMutation.mutate({ roleId: Number(id), payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [formData, isEdit, id, createMutation, updateMutation, t],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Loading state
  if (isEdit && isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/roles" />
        <div>
          <h1 className="text-xl font-semibold text-dark-100">
            {isEdit ? t('admin.roles.modal.editTitle') : t('admin.roles.modal.createTitle')}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="role-name" className="mb-1 block text-sm font-medium text-dark-200">
                {t('admin.roles.form.name')}
              </label>
              <input
                id="role-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500"
                placeholder={t('admin.roles.form.namePlaceholder')}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="role-description"
                className="mb-1 block text-sm font-medium text-dark-200"
              >
                {t('admin.roles.form.description')}
              </label>
              <textarea
                id="role-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500"
                placeholder={t('admin.roles.form.descriptionPlaceholder')}
                rows={2}
              />
            </div>

            {/* Level */}
            <div>
              <label htmlFor="role-level" className="mb-1 block text-sm font-medium text-dark-200">
                {t('admin.roles.form.level')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="role-level"
                  type="range"
                  min={0}
                  max={999}
                  value={formData.level}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, level: Number(e.target.value) }))
                  }
                  className="flex-1 accent-accent-500"
                />
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={formData.level}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      level: Math.min(999, Math.max(0, Number(e.target.value) || 0)),
                    }))
                  }
                  className="w-20 rounded-lg border border-dark-600 bg-dark-900 px-2 py-1.5 text-center text-sm text-dark-100 outline-none focus:border-accent-500"
                  aria-label={t('admin.roles.form.levelValue')}
                />
              </div>
              <p className="mt-1 text-xs text-dark-500">{t('admin.roles.form.levelHint')}</p>
            </div>

            {/* Color picker */}
            <div>
              <label className="mb-1 block text-sm font-medium text-dark-200">
                {t('admin.roles.form.color')}
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.color === color ? 'scale-110 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>

            {/* Preset buttons */}
            <div>
              <label className="mb-1 block text-sm font-medium text-dark-200">
                {t('admin.roles.form.presets')}
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESETS).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyPreset(key)}
                    className="rounded-lg border border-dark-600 bg-dark-700 px-3 py-1.5 text-xs font-medium text-dark-300 transition-colors hover:border-accent-500/50 hover:bg-accent-500/10 hover:text-accent-400"
                  >
                    {t(`admin.roles.presets.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Permission Matrix */}
        {permissionRegistry && permissionRegistry.length > 0 && (
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-6">
            <PermissionMatrix
              registry={permissionRegistry}
              selectedPermissions={formData.permissions}
              onToggle={handleTogglePermission}
              onToggleSection={handleToggleSection}
            />
            <p className="mt-2 text-xs text-dark-500">
              {t('admin.roles.form.selectedPermissions', { count: formData.permissions.length })}
            </p>
          </div>
        )}

        {/* Error & Submit */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-6">
          {formError && <p className="mb-4 text-sm text-error-400">{formError}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/roles')}
              className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
            >
              {t('admin.roles.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
            >
              {isSaving ? t('admin.roles.form.saving') : t('admin.roles.form.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
