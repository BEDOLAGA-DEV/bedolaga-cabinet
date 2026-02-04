import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  promocodesApi,
  PromoGroup,
  PromoGroupCreateRequest,
  PromoGroupUpdateRequest,
} from '../api/promocodes';
import { AdminBackButton } from '../components/admin';
import { useBackButton } from '../platform/hooks/useBackButton';

// Icons
const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

const RefreshIcon = () => (
  <svg
    className="h-4 w-4 animate-spin"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

interface PeriodDiscount {
  days: number;
  percent: number;
}

export default function AdminPromoGroupCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  useBackButton(() => navigate('/admin/promo-groups'));

  // Form state
  const [name, setName] = useState('');
  const [serverDiscount, setServerDiscount] = useState<number | ''>(0);
  const [trafficDiscount, setTrafficDiscount] = useState<number | ''>(0);
  const [deviceDiscount, setDeviceDiscount] = useState<number | ''>(0);
  const [applyToAddons, setApplyToAddons] = useState(true);
  const [autoAssignSpent, setAutoAssignSpent] = useState<number | ''>(0);
  const [periodDiscounts, setPeriodDiscounts] = useState<PeriodDiscount[]>([]);

  // Fetch promo group for editing
  const { isLoading: isLoadingGroup } = useQuery({
    queryKey: ['admin-promo-group', id],
    queryFn: () => promocodesApi.getPromoGroup(Number(id)),
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: useCallback((data: PromoGroup) => {
      setName(data.name);
      setServerDiscount(data.server_discount_percent || 0);
      setTrafficDiscount(data.traffic_discount_percent || 0);
      setDeviceDiscount(data.device_discount_percent || 0);
      setApplyToAddons(data.apply_discounts_to_addons ?? true);
      setAutoAssignSpent(
        data.auto_assign_total_spent_kopeks ? data.auto_assign_total_spent_kopeks / 100 : 0,
      );
      if (data.period_discounts && typeof data.period_discounts === 'object') {
        setPeriodDiscounts(
          Object.entries(data.period_discounts).map(([days, percent]) => ({
            days: parseInt(days),
            percent: typeof percent === 'number' ? percent : 0,
          })),
        );
      }
      return data;
    }, []),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: promocodesApi.createPromoGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-groups'] });
      navigate('/admin/promo-groups');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PromoGroupUpdateRequest }) =>
      promocodesApi.updatePromoGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-groups'] });
      navigate('/admin/promo-groups');
    },
  });

  const addPeriodDiscount = () => {
    setPeriodDiscounts([...periodDiscounts, { days: 30, percent: 0 }]);
  };

  const removePeriodDiscount = (index: number) => {
    setPeriodDiscounts(periodDiscounts.filter((_, i) => i !== index));
  };

  const updatePeriodDiscount = (index: number, field: 'days' | 'percent', value: number) => {
    const updated = [...periodDiscounts];
    updated[index][field] = value;
    setPeriodDiscounts(updated);
  };

  const handleSubmit = () => {
    // Convert periodDiscounts array to Record<number, number>
    const periodDiscountsRecord: Record<number, number> = {};
    periodDiscounts.forEach((pd) => {
      if (pd.days > 0 && pd.percent > 0) {
        periodDiscountsRecord[pd.days] = pd.percent;
      }
    });

    const serverVal = serverDiscount === '' ? 0 : serverDiscount;
    const trafficVal = trafficDiscount === '' ? 0 : trafficDiscount;
    const deviceVal = deviceDiscount === '' ? 0 : deviceDiscount;
    const autoAssignVal = autoAssignSpent === '' ? 0 : autoAssignSpent;

    const data: PromoGroupCreateRequest | PromoGroupUpdateRequest = {
      name,
      server_discount_percent: serverVal,
      traffic_discount_percent: trafficVal,
      device_discount_percent: deviceVal,
      period_discounts:
        Object.keys(periodDiscountsRecord).length > 0 ? periodDiscountsRecord : undefined,
      apply_discounts_to_addons: applyToAddons,
      auto_assign_total_spent_kopeks: autoAssignVal > 0 ? Math.round(autoAssignVal * 100) : null,
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data });
    } else {
      createMutation.mutate(data as PromoGroupCreateRequest);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isValid = name.trim().length > 0;

  // Loading state
  if (isEdit && isLoadingGroup) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/promo-groups" />
        <div>
          <h1 className="text-xl font-bold text-dark-100">
            {isEdit ? t('admin.promoGroups.editTitle') : t('admin.promoGroups.createTitle')}
          </h1>
          <p className="text-sm text-dark-400">{t('admin.promoGroups.subtitle')}</p>
        </div>
      </div>

      {/* Form */}
      <div className="card space-y-4">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promoGroups.form.name')}
            <span className="text-error-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder={t('admin.promoGroups.form.namePlaceholder')}
          />
        </div>

        {/* Category Discounts */}
        <div className="space-y-3 rounded-lg bg-dark-700/50 p-4">
          <h4 className="mb-3 text-sm font-medium text-dark-200">
            {t('admin.promoGroups.form.categoryDiscounts')}
          </h4>

          <div className="flex items-center gap-3">
            <span className="w-32 text-sm text-dark-400">{t('admin.promoGroups.servers')}:</span>
            <input
              type="number"
              value={serverDiscount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setServerDiscount('');
                } else {
                  setServerDiscount(Math.min(100, Math.max(0, parseInt(val) || 0)));
                }
              }}
              className="input w-20"
              min={0}
              max={100}
              placeholder="0"
            />
            <span className="text-dark-400">%</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-32 text-sm text-dark-400">{t('admin.promoGroups.traffic')}:</span>
            <input
              type="number"
              value={trafficDiscount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setTrafficDiscount('');
                } else {
                  setTrafficDiscount(Math.min(100, Math.max(0, parseInt(val) || 0)));
                }
              }}
              className="input w-20"
              min={0}
              max={100}
              placeholder="0"
            />
            <span className="text-dark-400">%</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-32 text-sm text-dark-400">{t('admin.promoGroups.devices')}:</span>
            <input
              type="number"
              value={deviceDiscount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setDeviceDiscount('');
                } else {
                  setDeviceDiscount(Math.min(100, Math.max(0, parseInt(val) || 0)));
                }
              }}
              className="input w-20"
              min={0}
              max={100}
              placeholder="0"
            />
            <span className="text-dark-400">%</span>
          </div>
        </div>

        {/* Period Discounts */}
        <div className="space-y-3 rounded-lg bg-dark-700/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium text-dark-200">
              {t('admin.promoGroups.form.periodDiscounts')}
            </h4>
            <button
              type="button"
              onClick={addPeriodDiscount}
              className="flex items-center gap-1 rounded bg-accent-500/20 px-2 py-1 text-xs text-accent-400 transition-colors hover:bg-accent-500/30"
            >
              <PlusIcon />
              {t('admin.promoGroups.form.add')}
            </button>
          </div>
          <p className="mb-3 text-xs text-dark-500">{t('admin.promoGroups.form.periodHint')}</p>

          {periodDiscounts.length === 0 ? (
            <p className="py-2 text-center text-sm text-dark-500">
              {t('admin.promoGroups.form.noPeriods')}
            </p>
          ) : (
            <div className="space-y-2">
              {periodDiscounts.map((pd, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pd.days}
                    onChange={(e) =>
                      updatePeriodDiscount(
                        index,
                        'days',
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    className="input w-20"
                    min={1}
                    placeholder={t('admin.promoGroups.form.daysPlaceholder')}
                  />
                  <span className="text-xs text-dark-400">{t('admin.promoGroups.form.arrow')}</span>
                  <input
                    type="number"
                    value={pd.percent}
                    onChange={(e) =>
                      updatePeriodDiscount(
                        index,
                        'percent',
                        Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                      )
                    }
                    className="input w-20"
                    min={0}
                    max={100}
                    placeholder="%"
                  />
                  <span className="text-dark-400">%</span>
                  <button
                    type="button"
                    onClick={() => removePeriodDiscount(index)}
                    className="p-1 text-dark-400 transition-colors hover:text-error-400"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-assign */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promoGroups.form.autoAssign')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={autoAssignSpent}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setAutoAssignSpent('');
                } else {
                  setAutoAssignSpent(Math.max(0, parseFloat(val) || 0));
                }
              }}
              className="input w-32"
              min={0}
              placeholder="0"
            />
            <span className="text-dark-400">{t('admin.promoGroups.form.rub')}</span>
          </div>
          <p className="mt-1 text-xs text-dark-500">{t('admin.promoGroups.form.autoAssignHint')}</p>
        </div>

        {/* Apply to addons */}
        <label className="flex cursor-pointer items-center gap-3">
          <button
            type="button"
            onClick={() => setApplyToAddons(!applyToAddons)}
            className={`relative h-6 w-10 rounded-full transition-colors ${
              applyToAddons ? 'bg-accent-500' : 'bg-dark-600'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                applyToAddons ? 'left-5' : 'left-1'
              }`}
            />
          </button>
          <span className="text-sm text-dark-200">{t('admin.promoGroups.form.applyToAddons')}</span>
        </label>
      </div>

      {/* Footer */}
      <div className="card">
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate('/admin/promo-groups')}
            className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
          >
            {t('admin.promoGroups.form.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="btn-primary flex items-center gap-2"
          >
            {isLoading && <RefreshIcon />}
            {isLoading ? t('admin.promoGroups.form.saving') : t('admin.promoGroups.form.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
