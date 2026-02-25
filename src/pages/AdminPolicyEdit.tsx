import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi, AccessPolicy, CreatePolicyPayload, UpdatePolicyPayload } from '@/api/rbac';
import { AdminBackButton } from '@/components/admin';

// === Types ===

interface PolicyConditions {
  time_range?: { start: string; end: string };
  ip_whitelist?: string[];
  rate_limit?: number;
}

interface PolicyFormData {
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  resource: string;
  actions: string[];
  role_id: number | null;
  priority: number;
  conditions: PolicyConditions;
  conditionsEnabled: {
    time_range: boolean;
    ip_whitelist: boolean;
    rate_limit: boolean;
  };
}

const INITIAL_FORM: PolicyFormData = {
  name: '',
  description: '',
  effect: 'allow',
  resource: '',
  actions: [],
  role_id: null,
  priority: 0,
  conditions: {
    time_range: { start: '09:00', end: '18:00' },
    ip_whitelist: [],
    rate_limit: 100,
  },
  conditionsEnabled: {
    time_range: false,
    ip_whitelist: false,
    rate_limit: false,
  },
};

// === Helpers ===

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

function buildConditionsPayload(
  conditions: PolicyConditions,
  enabled: PolicyFormData['conditionsEnabled'],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (enabled.time_range && conditions.time_range) {
    result.time_range = conditions.time_range;
  }
  if (enabled.ip_whitelist && conditions.ip_whitelist && conditions.ip_whitelist.length > 0) {
    result.ip_whitelist = conditions.ip_whitelist;
  }
  if (enabled.rate_limit && conditions.rate_limit !== undefined) {
    result.rate_limit = conditions.rate_limit;
  }

  return result;
}

// === Sub-components ===

interface IpTagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
}

function IpTagInput({ values, onChange }: IpTagInputProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const trimmed = inputValue.trim().replace(/,+$/, '');
        if (trimmed && !values.includes(trimmed)) {
          onChange([...values, trimmed]);
        }
        setInputValue('');
      } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
        onChange(values.slice(0, -1));
      }
    },
    [inputValue, values, onChange],
  );

  const removeIp = useCallback(
    (ip: string) => {
      onChange(values.filter((v) => v !== ip));
    },
    [values, onChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dark-600 bg-dark-900 px-3 py-2">
      {values.map((ip) => (
        <span
          key={ip}
          className="inline-flex items-center gap-1 rounded-md bg-dark-700 px-2 py-0.5 text-xs text-dark-200"
        >
          {ip}
          <button
            type="button"
            onClick={() => removeIp(ip)}
            className="text-dark-400 transition-colors hover:text-dark-200"
            aria-label={t('admin.policies.conditions.removeIp', { ip })}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-dark-100 placeholder-dark-500 outline-none"
        placeholder={values.length === 0 ? t('admin.policies.conditions.ipPlaceholder') : ''}
      />
    </div>
  );
}

interface ConditionToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ConditionToggle({ label, enabled, onToggle, children }: ConditionToggleProps) {
  return (
    <div className="rounded-lg border border-dark-700/50 bg-dark-800/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <span className="text-sm font-medium text-dark-200">{label}</span>
        <div
          className={`relative h-5 w-9 rounded-full transition-colors ${
            enabled ? 'bg-accent-500' : 'bg-dark-600'
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
      </button>
      {enabled && <div className="border-t border-dark-700/50 px-3 py-2.5">{children}</div>}
    </div>
  );
}

// === Main Page ===

export default function AdminPolicyEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState<PolicyFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch policy for editing
  const { isLoading: isLoadingPolicy } = useQuery({
    queryKey: ['admin-policy', id],
    queryFn: () => rbacApi.getPolicies(),
    enabled: isEdit,
    select: useCallback(
      (policies: AccessPolicy[]) => {
        const policy = policies.find((p) => p.id === Number(id));
        if (policy) {
          const parsed = parseConditions(policy.conditions);
          const actions = Array.isArray(policy.actions) ? policy.actions : [];

          setFormData({
            name: policy.name,
            description: policy.description ?? '',
            effect: policy.effect,
            resource: policy.resource,
            actions,
            role_id: policy.role_id ?? null,
            priority: policy.priority,
            conditions: {
              time_range: parsed.time_range ?? { start: '09:00', end: '18:00' },
              ip_whitelist: parsed.ip_whitelist ?? [],
              rate_limit: parsed.rate_limit ?? 100,
            },
            conditionsEnabled: {
              time_range: !!parsed.time_range,
              ip_whitelist: !!parsed.ip_whitelist && parsed.ip_whitelist.length > 0,
              rate_limit: parsed.rate_limit !== undefined,
            },
          });
        }
        return policy;
      },
      [id],
    ),
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: rbacApi.getRoles,
  });

  const { data: permissionRegistry } = useQuery({
    queryKey: ['admin-permission-registry'],
    queryFn: rbacApi.getPermissionRegistry,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreatePolicyPayload) => rbacApi.createPolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      navigate('/admin/policies');
    },
    onError: () => {
      setFormError(t('admin.policies.errors.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ policyId, payload }: { policyId: number; payload: UpdatePolicyPayload }) =>
      rbacApi.updatePolicy(policyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
      navigate('/admin/policies');
    },
    onError: () => {
      setFormError(t('admin.policies.errors.updateFailed'));
    },
  });

  // Derived data
  const selectedResourceActions = useMemo(() => {
    if (!formData.resource || !permissionRegistry) return [];
    const section = permissionRegistry.find((s) => s.section === formData.resource);
    return section?.actions ?? [];
  }, [formData.resource, permissionRegistry]);

  // Handlers
  const handleToggleAction = useCallback((action: string) => {
    setFormData((prev) => {
      const has = prev.actions.includes(action);
      return {
        ...prev,
        actions: has ? prev.actions.filter((a) => a !== action) : [...prev.actions, action],
      };
    });
  }, []);

  const handleResourceChange = useCallback((resource: string) => {
    setFormData((prev) => ({
      ...prev,
      resource,
      actions: [],
    }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!formData.name.trim()) {
        setFormError(t('admin.policies.errors.nameRequired'));
        return;
      }
      if (!formData.resource) {
        setFormError(t('admin.policies.errors.resourceRequired'));
        return;
      }
      if (formData.actions.length === 0) {
        setFormError(t('admin.policies.errors.actionsRequired'));
        return;
      }

      const conditionsPayload = buildConditionsPayload(
        formData.conditions,
        formData.conditionsEnabled,
      );

      if (isEdit) {
        const payload: UpdatePolicyPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          effect: formData.effect,
          resource: formData.resource,
          actions: formData.actions,
          conditions: conditionsPayload,
          priority: formData.priority,
          role_id: formData.role_id,
        };
        updateMutation.mutate({ policyId: Number(id), payload });
      } else {
        const payload: CreatePolicyPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          effect: formData.effect,
          resource: formData.resource,
          actions: formData.actions,
          conditions: conditionsPayload,
          priority: formData.priority,
          role_id: formData.role_id,
        };
        createMutation.mutate(payload);
      }
    },
    [formData, isEdit, id, createMutation, updateMutation, t],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Loading state
  if (isEdit && isLoadingPolicy) {
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
        <AdminBackButton to="/admin/policies" />
        <div>
          <h1 className="text-xl font-semibold text-dark-100">
            {isEdit ? t('admin.policies.modal.editTitle') : t('admin.policies.modal.createTitle')}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="policy-name" className="mb-1 block text-sm font-medium text-dark-200">
                {t('admin.policies.form.name')}
              </label>
              <input
                id="policy-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500"
                placeholder={t('admin.policies.form.namePlaceholder')}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="policy-description"
                className="mb-1 block text-sm font-medium text-dark-200"
              >
                {t('admin.policies.form.description')}
              </label>
              <textarea
                id="policy-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500"
                placeholder={t('admin.policies.form.descriptionPlaceholder')}
                rows={2}
              />
            </div>

            {/* Effect toggle */}
            <div>
              <label className="mb-1 block text-sm font-medium text-dark-200">
                {t('admin.policies.form.effect')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, effect: 'allow' }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    formData.effect === 'allow'
                      ? 'border-green-500/50 bg-green-500/10 text-green-400'
                      : 'border-dark-600 bg-dark-900 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  {t('admin.policies.effectAllow')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, effect: 'deny' }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    formData.effect === 'deny'
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : 'border-dark-600 bg-dark-900 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  {t('admin.policies.effectDeny')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Resource & Actions */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-6">
          <div className="space-y-4">
            {/* Resource dropdown */}
            <div>
              <label
                htmlFor="policy-resource"
                className="mb-1 block text-sm font-medium text-dark-200"
              >
                {t('admin.policies.form.resource')}
              </label>
              <select
                id="policy-resource"
                value={formData.resource}
                onChange={(e) => handleResourceChange(e.target.value)}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none transition-colors focus:border-accent-500"
              >
                <option value="">{t('admin.policies.form.selectResource')}</option>
                {permissionRegistry?.map((section) => (
                  <option key={section.section} value={section.section}>
                    {t(`admin.roles.form.permissionSections.${section.section}`, section.section)}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions checkboxes */}
            {formData.resource && selectedResourceActions.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-200">
                  {t('admin.policies.form.actions')}
                </label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-dark-600 bg-dark-900/50 p-3">
                  {selectedResourceActions.map((action) => {
                    const selected = formData.actions.includes(action);
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleToggleAction(action)}
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

            {/* Role dropdown */}
            <div>
              <label htmlFor="policy-role" className="mb-1 block text-sm font-medium text-dark-200">
                {t('admin.policies.form.role')}
              </label>
              <select
                id="policy-role"
                value={formData.role_id ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    role_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none transition-colors focus:border-accent-500"
              >
                <option value="">{t('admin.policies.form.globalOption')}</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-dark-500">{t('admin.policies.form.roleHint')}</p>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="policy-priority"
                className="mb-1 block text-sm font-medium text-dark-200"
              >
                {t('admin.policies.form.priority')}
              </label>
              <input
                id="policy-priority"
                type="number"
                min={0}
                max={999}
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: Math.min(999, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none transition-colors focus:border-accent-500"
              />
              <p className="mt-1 text-xs text-dark-500">{t('admin.policies.form.priorityHint')}</p>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-6">
          <label className="mb-3 block text-sm font-medium text-dark-200">
            {t('admin.policies.form.conditions')}
          </label>
          <div className="space-y-2">
            {/* Time range */}
            <ConditionToggle
              label={t('admin.policies.conditions.timeRange')}
              enabled={formData.conditionsEnabled.time_range}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  conditionsEnabled: {
                    ...prev.conditionsEnabled,
                    time_range: !prev.conditionsEnabled.time_range,
                  },
                }))
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={formData.conditions.time_range?.start ?? '09:00'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        time_range: {
                          start: e.target.value,
                          end: prev.conditions.time_range?.end ?? '18:00',
                        },
                      },
                    }))
                  }
                  className="rounded-lg border border-dark-600 bg-dark-900 px-2 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
                  aria-label={t('admin.policies.conditions.timeStart')}
                />
                <span className="text-dark-500">-</span>
                <input
                  type="time"
                  value={formData.conditions.time_range?.end ?? '18:00'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        time_range: {
                          start: prev.conditions.time_range?.start ?? '09:00',
                          end: e.target.value,
                        },
                      },
                    }))
                  }
                  className="rounded-lg border border-dark-600 bg-dark-900 px-2 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
                  aria-label={t('admin.policies.conditions.timeEnd')}
                />
              </div>
            </ConditionToggle>

            {/* IP whitelist */}
            <ConditionToggle
              label={t('admin.policies.conditions.ipWhitelist')}
              enabled={formData.conditionsEnabled.ip_whitelist}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  conditionsEnabled: {
                    ...prev.conditionsEnabled,
                    ip_whitelist: !prev.conditionsEnabled.ip_whitelist,
                  },
                }))
              }
            >
              <IpTagInput
                values={formData.conditions.ip_whitelist ?? []}
                onChange={(ips) =>
                  setFormData((prev) => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      ip_whitelist: ips,
                    },
                  }))
                }
              />
            </ConditionToggle>

            {/* Rate limit */}
            <ConditionToggle
              label={t('admin.policies.conditions.rateLimit')}
              enabled={formData.conditionsEnabled.rate_limit}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  conditionsEnabled: {
                    ...prev.conditionsEnabled,
                    rate_limit: !prev.conditionsEnabled.rate_limit,
                  },
                }))
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={formData.conditions.rate_limit ?? 100}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        rate_limit: Math.max(1, Number(e.target.value) || 1),
                      },
                    }))
                  }
                  className="w-24 rounded-lg border border-dark-600 bg-dark-900 px-2 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
                  aria-label={t('admin.policies.conditions.rateLimitValue')}
                />
                <span className="text-xs text-dark-500">
                  {t('admin.policies.conditions.perHour')}
                </span>
              </div>
            </ConditionToggle>
          </div>
        </div>

        {/* Error & Submit */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-6">
          {formError && <p className="mb-4 text-sm text-error-400">{formError}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/policies')}
              className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
            >
              {t('admin.policies.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
            >
              {isSaving ? t('admin.policies.form.saving') : t('admin.policies.form.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
