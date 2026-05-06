import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminLandingsApi,
  type LandingCreateRequest,
  type AdminLandingFeature,
  type EditableMethodField,
  type LocaleDict,
  type SupportedLocale,
  toLocaleDict,
} from '../api/landings';
import { tariffsApi, TariffListItem, PeriodPrice } from '../api/tariffs';
import { formatPrice } from '../utils/format';
import { adminPaymentMethodsApi } from '../api/adminPaymentMethods';
import { Toggle, LocaleTabs, LocalizedInput } from '../components/admin';
import { BackgroundConfigEditor } from '../components/admin/BackgroundConfigEditor';
import type { AnimationConfig } from '@/components/ui/backgrounds/types';
import { DEFAULT_ANIMATION_CONFIG } from '@/components/ui/backgrounds/types';
import { SortableFeatureItem, type FeatureWithId } from '../components/admin/SortableFeatureItem';
import {
  SortableSelectedMethodCard,
  type MethodWithId,
} from '../components/admin/SortableSelectedMethodCard';
import { useNotify } from '@/platform';
import { usePlatform } from '../platform/hooks/usePlatform';
import { getApiErrorMessage } from '../utils/api-error';
import { BackIcon, PlusIcon } from '../components/icons/LandingIcons';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '../lib/utils';
import type { PaymentMethodSubOptionInfo } from '../types';

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    className={cn('h-5 w-5 transition-transform', open && 'rotate-180')}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

// ============ Collapsible Section ============

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, open, onToggle, children }: SectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-900/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-start text-sm font-medium text-dark-100 hover:bg-dark-800/50"
      >
        {title}
        <ChevronDownIcon open={open} />
      </button>
      {open && <div className="border-t border-dark-700 px-4 py-4">{children}</div>}
    </div>
  );
}

// ============ Main Editor ============

export default function AdminLandingEditor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const { capabilities } = usePlatform();
  const isEdit = !!id;

  // Section visibility
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    features: false,
    tariffs: false,
    discount: false,
    methods: false,
    gifts: false,
    background: false,
    analytics: false,
    footer: false,
  });

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Locale editing state
  const [editingLocale, setEditingLocale] = useState<SupportedLocale>('ru');

  // Form state — text fields are now LocaleDict
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState<LocaleDict>({ ru: '' });
  const [subtitle, setSubtitle] = useState<LocaleDict>({});
  const [isActive, setIsActive] = useState(true);
  const [metaTitle, setMetaTitle] = useState<LocaleDict>({});
  const [metaDescription, setMetaDescription] = useState<LocaleDict>({});
  const [features, setFeatures] = useState<FeatureWithId[]>([]);
  const [selectedTariffIds, setSelectedTariffIds] = useState<number[]>([]);
  const [allowedPeriods, setAllowedPeriods] = useState<Record<string, number[]>>({});
  const [paymentMethods, setPaymentMethods] = useState<MethodWithId[]>([]);
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [footerText, setFooterText] = useState<LocaleDict>({});
  const [customCss, setCustomCss] = useState('');

  // Background config state
  const [backgroundConfig, setBackgroundConfig] = useState<AnimationConfig>({
    ...DEFAULT_ANIMATION_CONFIG,
    enabled: false,
  });

  // Analytics goals state
  const [analyticsViewEnabled, setAnalyticsViewEnabled] = useState(false);
  const [analyticsViewGoal, setAnalyticsViewGoal] = useState('landing_view');
  const [analyticsClickEnabled, setAnalyticsClickEnabled] = useState(false);
  const [analyticsClickGoal, setAnalyticsClickGoal] = useState('landing_pay');
  const [stickyPayButton, setStickyPayButton] = useState(false);

  // Discount state
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [discountOverrides, setDiscountOverrides] = useState<Record<string, number>>({});
  const [discountStartsAt, setDiscountStartsAt] = useState('');
  const [discountEndsAt, setDiscountEndsAt] = useState('');
  const [discountBadgeText, setDiscountBadgeText] = useState<LocaleDict>({});

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Fetch tariffs for selection
  const { data: tariffsData } = useQuery({
    queryKey: ['admin-tariffs'],
    queryFn: () => tariffsApi.getTariffs(true),
    staleTime: 30_000,
  });

  const allTariffs = tariffsData?.tariffs ?? [];

  // Fetch system payment methods
  const { data: systemMethods } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: () => adminPaymentMethodsApi.getAll(),
    staleTime: 30_000,
  });

  const availablePaymentMethods = useMemo(
    () => (systemMethods ?? []).filter((m) => m.is_enabled && m.is_provider_configured),
    [systemMethods],
  );

  const subOptionsMap = useMemo(() => {
    const map: Record<string, PaymentMethodSubOptionInfo[]> = {};
    for (const m of availablePaymentMethods) {
      if (m.available_sub_options && m.available_sub_options.length > 0) {
        map[m.method_id] = m.available_sub_options;
      }
    }
    return map;
  }, [availablePaymentMethods]);

  // Fetch tariff details for period info
  const tariffDetailQueries = useQueries({
    queries: selectedTariffIds.map((tariffId) => ({
      queryKey: ['admin-tariff-detail', tariffId],
      queryFn: () => tariffsApi.getTariff(tariffId),
      staleTime: 60_000,
      enabled: selectedTariffIds.includes(tariffId),
    })),
  });

  const tariffPeriodsData = tariffDetailQueries.map((q) => q.data);
  const tariffPeriodsMap = useMemo(() => {
    const map: Record<number, PeriodPrice[]> = {};
    tariffPeriodsData.forEach((data) => {
      if (data) {
        map[data.id] = data.period_prices;
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tariffPeriodsData.map((d) => d?.id)), selectedTariffIds]);

  // Fetch landing for editing
  const { data: landingData } = useQuery({
    queryKey: ['admin-landing', id],
    queryFn: () => adminLandingsApi.get(Number(id)),
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Populate form from fetched data (only once)
  const formPopulated = useRef(false);

  // Reset formPopulated when navigating to a different landing
  useEffect(() => {
    formPopulated.current = false;
  }, [id]);

  useEffect(() => {
    if (!landingData || formPopulated.current) return;
    formPopulated.current = true;
    setSlug(landingData.slug);
    setTitle(toLocaleDict(landingData.title, { ru: '' }));
    setSubtitle(toLocaleDict(landingData.subtitle));
    setIsActive(landingData.is_active);
    setMetaTitle(toLocaleDict(landingData.meta_title));
    setMetaDescription(toLocaleDict(landingData.meta_description));
    setFeatures(
      (landingData.features ?? []).map((f) => ({
        ...f,
        _id: crypto.randomUUID(),
        title: toLocaleDict(f.title),
        description: toLocaleDict(f.description),
      })),
    );
    setSelectedTariffIds(landingData.allowed_tariff_ids ?? []);
    setAllowedPeriods(landingData.allowed_periods ?? {});
    setPaymentMethods(
      (landingData.payment_methods ?? []).map((m) => ({
        ...m,
        _id: crypto.randomUUID(),
        min_amount_kopeks: m.min_amount_kopeks ?? null,
        max_amount_kopeks: m.max_amount_kopeks ?? null,
        currency: m.currency ?? null,
        return_url: m.return_url ?? null,
        sub_options: m.sub_options ?? null,
      })),
    );
    setGiftEnabled(landingData.gift_enabled);
    setFooterText(toLocaleDict(landingData.footer_text));
    setCustomCss(landingData.custom_css ?? '');
    if (landingData.background_config) {
      setBackgroundConfig(landingData.background_config);
    }
    setDiscountPercent(landingData.discount_percent ?? null);
    setDiscountOverrides(landingData.discount_overrides ?? {});
    setDiscountStartsAt(
      landingData.discount_starts_at ? isoToDatetimeLocal(landingData.discount_starts_at) : '',
    );
    setDiscountEndsAt(
      landingData.discount_ends_at ? isoToDatetimeLocal(landingData.discount_ends_at) : '',
    );
    setDiscountBadgeText(toLocaleDict(landingData.discount_badge_text));
    setAnalyticsViewEnabled(landingData.analytics_view_enabled ?? false);
    setAnalyticsViewGoal(landingData.analytics_view_goal || 'landing_view');
    setAnalyticsClickEnabled(landingData.analytics_click_enabled ?? false);
    setAnalyticsClickGoal(landingData.analytics_click_goal || 'landing_pay');
    setStickyPayButton(landingData.sticky_pay_button ?? false);
  }, [landingData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: adminLandingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-landings'] });
      notify.success(t('admin.landings.created'));
      navigate('/admin/landings');
    },
    onError: (err: unknown) => {
      notify.error(getApiErrorMessage(err, t('common.error')));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ landingId, data }: { landingId: number; data: LandingCreateRequest }) =>
      adminLandingsApi.update(landingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-landings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-landing', id] });
      notify.success(t('admin.landings.updated'));
      navigate('/admin/landings');
    },
    onError: (err: unknown) => {
      notify.error(getApiErrorMessage(err, t('common.error')));
    },
  });

  /** Return a LocaleDict only if it has at least one non-empty value, else undefined */
  const nonEmptyDict = (dict: LocaleDict): LocaleDict | undefined => {
    const filtered = Object.fromEntries(
      Object.entries(dict).filter(([, v]) => typeof v === 'string' && v.trim().length > 0),
    );
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  };

  const handleSubmit = () => {
    // Client-side validation
    if (!isEdit && !/^[a-z0-9-]+$/.test(slug)) {
      notify.error(
        t(
          'admin.landings.invalidSlug',
          'Slug can only contain lowercase letters, numbers, and hyphens',
        ),
      );
      return;
    }
    const titleHasContent = Object.values(title).some((v) => v.trim().length > 0);
    if (!titleHasContent) {
      notify.error(t('admin.landings.titleRequired', 'Title is required'));
      return;
    }
    if (selectedTariffIds.length === 0) {
      notify.error(t('admin.landings.noTariffs', 'Select at least one tariff'));
      return;
    }
    if (paymentMethods.length === 0) {
      notify.error(t('admin.landings.noPaymentMethods', 'Add at least one payment method'));
      return;
    }

    // Strip _id before sending to API
    const cleanFeatures: AdminLandingFeature[] = features.map(({ _id: _, ...rest }) => rest);
    const cleanMethods = paymentMethods.map(({ _id: _, ...rest }) => ({
      ...rest,
      description: rest.description || null,
      icon_url: rest.icon_url || null,
      min_amount_kopeks: rest.min_amount_kopeks ?? null,
      max_amount_kopeks: rest.max_amount_kopeks ?? null,
      currency: rest.currency || null,
      return_url: rest.return_url || null,
      sub_options: rest.sub_options ?? null,
    }));

    // Filter out empty period arrays and periods for non-selected tariffs
    const cleanPeriods = Object.fromEntries(
      Object.entries(allowedPeriods).filter(
        ([key, days]) => days.length > 0 && selectedTariffIds.includes(Number(key)),
      ),
    );

    const data: LandingCreateRequest = {
      slug,
      title,
      subtitle: nonEmptyDict(subtitle),
      is_active: isActive,
      features: cleanFeatures,
      footer_text: nonEmptyDict(footerText),
      allowed_tariff_ids: selectedTariffIds,
      allowed_periods: cleanPeriods,
      payment_methods: cleanMethods,
      gift_enabled: giftEnabled,
      custom_css: customCss || undefined,
      meta_title: nonEmptyDict(metaTitle),
      meta_description: nonEmptyDict(metaDescription),
      discount_percent: discountPercent ?? null,
      discount_overrides:
        discountPercent !== null && Object.keys(discountOverrides).length > 0
          ? discountOverrides
          : null,
      discount_starts_at:
        discountPercent !== null && discountStartsAt
          ? new Date(discountStartsAt).toISOString()
          : null,
      discount_ends_at:
        discountPercent !== null && discountEndsAt ? new Date(discountEndsAt).toISOString() : null,
      discount_badge_text:
        discountPercent !== null ? (nonEmptyDict(discountBadgeText) ?? null) : null,
      background_config: backgroundConfig.enabled ? backgroundConfig : null,
      analytics_view_enabled: analyticsViewEnabled,
      analytics_view_goal: analyticsViewGoal,
      analytics_click_enabled: analyticsClickEnabled,
      analytics_click_goal: analyticsClickGoal,
      sticky_pay_button: stickyPayButton,
    };

    if (isEdit) {
      updateMutation.mutate({ landingId: Number(id), data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ---- Features helpers ----
  const addFeature = () => {
    setFeatures((prev) => [
      ...prev,
      { _id: crypto.randomUUID(), icon: '', title: {}, description: {} },
    ]);
  };

  const updateFeatureIcon = useCallback((index: number, value: string) => {
    setFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, icon: value } : f)));
  }, []);

  const updateFeatureLocalized = useCallback(
    (index: number, field: 'title' | 'description', value: LocaleDict) => {
      setFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
    },
    [],
  );

  const removeFeature = useCallback((index: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFeatureDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFeatures((prev) => {
        const oldIndex = prev.findIndex((f) => f._id === active.id);
        const newIndex = prev.findIndex((f) => f._id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  // ---- Payment methods helpers ----
  const togglePaymentMethod = useCallback(
    (methodId: string) => {
      setPaymentMethods((prev) => {
        const exists = prev.find((m) => m.method_id === methodId);
        if (exists) {
          return prev.filter((m) => m.method_id !== methodId);
        }
        const systemMethod = availablePaymentMethods.find((m) => m.method_id === methodId);
        if (!systemMethod) return prev;
        // Seed sub_options from global config defaults; if no global overrides exist,
        // explicitly set all available sub-options to enabled
        const subOptions =
          systemMethod.available_sub_options && systemMethod.available_sub_options.length > 0
            ? systemMethod.sub_options
              ? { ...systemMethod.sub_options }
              : Object.fromEntries(systemMethod.available_sub_options.map((o) => [o.id, true]))
            : null;
        return [
          ...prev,
          {
            _id: crypto.randomUUID(),
            method_id: systemMethod.method_id,
            display_name: systemMethod.display_name ?? systemMethod.default_display_name,
            description: null,
            icon_url: null,
            sort_order: prev.length,
            min_amount_kopeks: systemMethod.min_amount_kopeks ?? null,
            max_amount_kopeks: systemMethod.max_amount_kopeks ?? null,
            currency: null,
            return_url: null,
            sub_options: subOptions,
          },
        ];
      });
    },
    [availablePaymentMethods],
  );

  const updatePaymentMethod = useCallback(
    (methodId: string, field: EditableMethodField, value: string | number | null) => {
      setPaymentMethods((prev) =>
        prev.map((m) => (m.method_id === methodId ? { ...m, [field]: value } : m)),
      );
    },
    [],
  );

  const updateSubOptions = useCallback((methodId: string, subOptions: Record<string, boolean>) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.method_id === methodId ? { ...m, sub_options: subOptions } : m)),
    );
  }, []);

  const removePaymentMethod = useCallback((methodId: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m.method_id !== methodId));
  }, []);

  const handleMethodDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPaymentMethods((prev) => {
        const oldIndex = prev.findIndex((m) => m._id === active.id);
        const newIndex = prev.findIndex((m) => m._id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  // ---- Tariff/period helpers ----
  const toggleTariff = (tariffId: number) => {
    setSelectedTariffIds((prev) => {
      if (prev.includes(tariffId)) {
        const key = String(tariffId);
        // Clean up allowedPeriods for unchecked tariff
        setAllowedPeriods((ap) => {
          if (!(key in ap)) return ap;
          const { [key]: _, ...rest } = ap;
          return rest;
        });
        // Clean up discount override for unchecked tariff
        setDiscountOverrides((overrides) => {
          if (!(key in overrides)) return overrides;
          const { [key]: _, ...rest } = overrides;
          return rest;
        });
        return prev.filter((id) => id !== tariffId);
      }
      return [...prev, tariffId];
    });
  };

  const togglePeriodFromTariff = (tariffId: number, days: number, allPeriods: PeriodPrice[]) => {
    const key = String(tariffId);
    const allDays = allPeriods.map((p) => p.days);

    setAllowedPeriods((prev) => {
      const current = prev[key];
      if (!current) {
        // No override yet -- all periods allowed. Remove this one.
        const updated = allDays.filter((d) => d !== days);
        return { ...prev, [key]: updated };
      }

      const hasDay = current.includes(days);
      const updated = hasDay ? current.filter((d) => d !== days) : [...current, days];

      // If all periods are selected again, remove the override
      if (updated.length === allDays.length) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [key]: updated };
    });
  };

  // Feature IDs for DnD
  const featureIds = useMemo(() => features.map((f) => f._id), [features]);
  const methodIds = useMemo(() => paymentMethods.map((m) => m._id), [paymentMethods]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin/landings')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <h1 className="text-xl font-semibold text-dark-100">
            {isEdit ? t('admin.landings.edit') : t('admin.landings.create')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/landings')}
            className="rounded-lg border border-dark-700 bg-dark-800 px-4 py-2 text-sm text-dark-300 transition-colors hover:border-dark-600"
          >
            {t('admin.landings.back')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !slug || !Object.values(title).some((v) => v.trim())}
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            {isPending && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {t('admin.landings.save')}
          </button>
        </div>
      </div>

      {/* Locale tabs — always visible above sections */}
      <LocaleTabs
        activeLocale={editingLocale}
        onChange={setEditingLocale}
        contentIndicators={[
          title,
          subtitle,
          metaTitle,
          metaDescription,
          footerText,
          discountBadgeText,
          ...features.flatMap((f) => [f.title, f.description]),
        ]}
        className="mb-4"
      />

      <div className="space-y-4">
        {/* General Section */}
        <Section
          title={t('admin.landings.general')}
          open={openSections.general}
          onToggle={() => toggleSection('general')}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="landing-slug" className="mb-1 block text-sm text-dark-400">
                {t('admin.landings.slug')}
              </label>
              <input
                id="landing-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={isEdit}
                placeholder="my-landing"
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-dark-500">{t('admin.landings.slugHint')}</p>
            </div>

            <div>
              <label htmlFor="landing-title" className="mb-1 block text-sm text-dark-400">
                {t('admin.landings.pageTitle')}
              </label>
              <LocalizedInput
                id="landing-title"
                value={title}
                onChange={setTitle}
                locale={editingLocale}
              />
            </div>

            <div>
              <label htmlFor="landing-subtitle" className="mb-1 block text-sm text-dark-400">
                {t('admin.landings.subtitle')}
              </label>
              <LocalizedInput
                id="landing-subtitle"
                value={subtitle}
                onChange={setSubtitle}
                locale={editingLocale}
                multiline
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-dark-400">{t('admin.landings.active')}</label>
              <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} />
            </div>

            {/* SEO */}
            <div className="border-t border-dark-700 pt-4">
              <h4 className="mb-3 text-sm font-medium text-dark-300">{t('admin.landings.seo')}</h4>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-dark-400">
                    {t('admin.landings.metaTitle')}
                  </label>
                  <LocalizedInput
                    value={metaTitle}
                    onChange={setMetaTitle}
                    locale={editingLocale}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-dark-400">
                    {t('admin.landings.metaDesc')}
                  </label>
                  <LocalizedInput
                    value={metaDescription}
                    onChange={setMetaDescription}
                    locale={editingLocale}
                    multiline
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Features Section */}
        <Section
          title={t('admin.landings.features')}
          open={openSections.features}
          onToggle={() => toggleSection('features')}
        >
          <div className="space-y-3">
            <DndContext sensors={sensors} onDragEnd={handleFeatureDragEnd}>
              <SortableContext items={featureIds} strategy={verticalListSortingStrategy}>
                {features.map((feature, index) => (
                  <SortableFeatureItem
                    key={feature._id}
                    feature={feature}
                    index={index}
                    locale={editingLocale}
                    onUpdateIcon={updateFeatureIcon}
                    onUpdateLocalized={updateFeatureLocalized}
                    onRemove={removeFeature}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <button
              onClick={addFeature}
              className="flex items-center gap-2 rounded-lg border border-dashed border-dark-600 px-4 py-2 text-sm text-dark-400 transition-colors hover:border-dark-500 hover:text-dark-300"
            >
              <PlusIcon />
              {t('admin.landings.addFeature')}
            </button>
          </div>
        </Section>

        {/* Tariffs Section */}
        <Section
          title={t('admin.landings.tariffs')}
          open={openSections.tariffs}
          onToggle={() => toggleSection('tariffs')}
        >
          <div className="space-y-3">
            <p className="text-sm text-dark-500">{t('admin.landings.selectTariffs')}</p>
            {allTariffs.map((tariff: TariffListItem) => (
              <div key={tariff.id} className="rounded-lg border border-dark-700 bg-dark-800/50 p-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTariffIds.includes(tariff.id)}
                    onChange={() => toggleTariff(tariff.id)}
                    className="h-4 w-4 rounded border-dark-600 bg-dark-700 text-accent-500"
                  />
                  <span className="text-sm font-medium text-dark-100">{tariff.name}</span>
                  {!tariff.is_active && (
                    <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                      {t('admin.landings.inactive')}
                    </span>
                  )}
                </label>
                {/* Period checkboxes from tariff detail */}
                {selectedTariffIds.includes(tariff.id) && !tariff.is_daily && (
                  <div className="ml-7 mt-2">
                    <span className="text-xs text-dark-500">{t('admin.landings.periods')}:</span>
                    {tariffPeriodsMap[tariff.id] ? (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {tariffPeriodsMap[tariff.id].map((period) => {
                          const override = allowedPeriods[String(tariff.id)];
                          const isAllowed = !override || override.includes(period.days);
                          return (
                            <button
                              key={period.days}
                              onClick={() =>
                                togglePeriodFromTariff(
                                  tariff.id,
                                  period.days,
                                  tariffPeriodsMap[tariff.id],
                                )
                              }
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                                isAllowed
                                  ? 'bg-accent-500/20 text-accent-400'
                                  : 'bg-dark-700/50 text-dark-500 line-through',
                              )}
                            >
                              {period.days}
                              {t('admin.landings.periodDaySuffix')} —{' '}
                              {formatPrice(period.price_kopeks)}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="ml-2 text-xs text-dark-600">
                        {t('admin.landings.loadingPeriods')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Discount Section */}
        <Section
          title={t('admin.landings.discount', 'Discount')}
          open={openSections.discount}
          onToggle={() => toggleSection('discount')}
        >
          <div className="space-y-4">
            {/* Enable/disable discount */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-dark-400">
                {t('admin.landings.discountEnabled', 'Enable discount')}
              </label>
              <Toggle
                checked={discountPercent !== null}
                onChange={() => {
                  if (discountPercent !== null) {
                    setDiscountPercent(null);
                    setDiscountOverrides({});
                    setDiscountStartsAt('');
                    setDiscountEndsAt('');
                    setDiscountBadgeText({});
                  } else {
                    setDiscountPercent(10);
                  }
                }}
              />
            </div>

            {discountPercent !== null && (
              <div className="space-y-4">
                {/* Global percent */}
                <div>
                  <label className="mb-1 block text-sm text-dark-400">
                    {t('admin.landings.discountPercent', 'Discount %')}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-dark-700 accent-accent-500"
                    />
                    <div className="flex w-20 items-center rounded-lg border border-dark-700 bg-dark-800">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={discountPercent}
                        onChange={(e) => {
                          const v = Math.min(99, Math.max(1, Number(e.target.value) || 1));
                          setDiscountPercent(v);
                        }}
                        className="w-full bg-transparent px-2 py-1.5 text-center text-sm text-dark-100 outline-none"
                      />
                      <span className="pr-2 text-sm text-dark-400">%</span>
                    </div>
                  </div>
                </div>

                {/* Date range */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-dark-400">
                      {t('admin.landings.discountStartsAt', 'Start date')}
                    </label>
                    <input
                      type="datetime-local"
                      value={discountStartsAt}
                      onChange={(e) => setDiscountStartsAt(e.target.value)}
                      className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-dark-400">
                      {t('admin.landings.discountEndsAt', 'End date')}
                    </label>
                    <input
                      type="datetime-local"
                      value={discountEndsAt}
                      onChange={(e) => setDiscountEndsAt(e.target.value)}
                      className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                </div>

                {/* Badge text */}
                <div>
                  <label className="mb-1 block text-sm text-dark-400">
                    {t('admin.landings.discountBadge', 'Banner text (optional)')}
                  </label>
                  <LocalizedInput
                    value={discountBadgeText}
                    onChange={setDiscountBadgeText}
                    locale={editingLocale}
                    placeholder={t('admin.landings.discountBadgePlaceholder', 'e.g. Spring sale!')}
                  />
                </div>

                {/* Per-tariff overrides */}
                {selectedTariffIds.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm text-dark-400">
                      {t('admin.landings.discountOverrides', 'Per-tariff overrides')}
                    </label>
                    <p className="mb-2 text-xs text-dark-500">
                      {t(
                        'admin.landings.discountOverridesHint',
                        'Leave empty to use global discount',
                      )}
                    </p>
                    <div className="space-y-2">
                      {selectedTariffIds.map((tariffId) => {
                        const tariff = allTariffs.find((tr) => tr.id === tariffId);
                        if (!tariff) return null;
                        const override = discountOverrides[String(tariffId)];
                        const hasOverride = override !== undefined;
                        return (
                          <div
                            key={tariffId}
                            className="flex items-center gap-3 rounded-lg border border-dark-700 bg-dark-800/50 px-3 py-2"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-dark-200">
                              {tariff.name}
                            </span>
                            <span className="text-xs text-dark-500">
                              {hasOverride ? `${override}%` : `${discountPercent}%`}
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={hasOverride ? override : ''}
                              placeholder={String(discountPercent)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDiscountOverrides((prev) => {
                                  if (!val) {
                                    const { [String(tariffId)]: _, ...rest } = prev;
                                    return rest;
                                  }
                                  return {
                                    ...prev,
                                    [String(tariffId)]: Math.min(99, Math.max(1, Number(val))),
                                  };
                                });
                              }}
                              className="w-16 rounded border border-dark-600 bg-dark-700 px-2 py-1 text-center text-sm text-dark-100 outline-none focus:border-accent-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Preview */}
                {selectedTariffIds.length > 0 && (
                  <div className="rounded-lg border border-dark-600 bg-dark-800/30 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                      {t('admin.landings.discountPreview', 'Preview')}
                    </p>
                    {selectedTariffIds.slice(0, 3).map((tariffId) => {
                      const tariff = allTariffs.find((tr) => tr.id === tariffId);
                      if (!tariff) return null;
                      const override = discountOverrides[String(tariffId)];
                      const pct = override ?? discountPercent ?? 0;
                      const periods = tariffPeriodsMap[tariffId];
                      if (!periods || periods.length === 0) return null;
                      const firstPeriod = periods[0];
                      const discounted = Math.max(
                        1,
                        firstPeriod.price_kopeks -
                          Math.floor((firstPeriod.price_kopeks * pct) / 100),
                      );
                      return (
                        <div key={tariffId} className="flex items-center gap-2 py-1">
                          <span className="text-sm text-dark-300">{tariff.name}:</span>
                          <span className="text-xs text-dark-500 line-through">
                            {formatPrice(firstPeriod.price_kopeks)}
                          </span>
                          <span className="text-sm font-semibold text-accent-400">
                            {formatPrice(discounted)}
                          </span>
                          <span className="rounded-full bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-400">
                            -{pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Payment Methods Section */}
        <Section
          title={t('admin.landings.paymentMethods')}
          open={openSections.methods}
          onToggle={() => toggleSection('methods')}
        >
          <div className="space-y-4">
            {/* Available system methods as toggleable list */}
            <div>
              <p className="mb-2 text-sm text-dark-500">{t('admin.landings.selectMethods')}</p>
              <div className="space-y-2">
                {availablePaymentMethods.map((sysMethod) => {
                  const isSelected = paymentMethods.some(
                    (m) => m.method_id === sysMethod.method_id,
                  );
                  return (
                    <label
                      key={sysMethod.method_id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                        isSelected
                          ? 'border-accent-500/50 bg-accent-500/5'
                          : 'border-dark-700 bg-dark-800/50 hover:border-dark-600',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePaymentMethod(sysMethod.method_id)}
                        className="h-4 w-4 rounded border-dark-600 bg-dark-700 text-accent-500"
                      />
                      <span className="flex items-center gap-2 text-sm font-medium text-dark-100">
                        {sysMethod.display_name ?? sysMethod.default_display_name}
                        {sysMethod.available_sub_options &&
                          sysMethod.available_sub_options.length > 0 && (
                            <span className="rounded-full bg-dark-700 px-1.5 py-0.5 text-[10px] text-dark-400">
                              {sysMethod.available_sub_options.map((o) => o.name).join(' / ')}
                            </span>
                          )}
                      </span>
                    </label>
                  );
                })}
                {availablePaymentMethods.length === 0 && (
                  <p className="text-sm text-dark-600">{t('admin.landings.noSystemMethods')}</p>
                )}
              </div>
            </div>

            {/* Selected methods with drag-to-reorder */}
            {paymentMethods.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-dark-500">{t('admin.landings.methodOrder')}</p>
                <DndContext sensors={sensors} onDragEnd={handleMethodDragEnd}>
                  <SortableContext items={methodIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {paymentMethods.map((method) => (
                        <SortableSelectedMethodCard
                          key={method._id}
                          method={method}
                          availableSubOptions={subOptionsMap[method.method_id] ?? null}
                          onUpdate={updatePaymentMethod}
                          onSubOptionsChange={updateSubOptions}
                          onRemove={removePaymentMethod}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </Section>

        {/* Gift Settings Section */}
        <Section
          title={t('admin.landings.gifts')}
          open={openSections.gifts}
          onToggle={() => toggleSection('gifts')}
        >
          <div className="flex items-center justify-between">
            <label className="text-sm text-dark-400">{t('admin.landings.giftEnabled')}</label>
            <Toggle checked={giftEnabled} onChange={() => setGiftEnabled(!giftEnabled)} />
          </div>
        </Section>

        {/* Background Section */}
        <Section
          title={t('admin.landings.background', 'Background')}
          open={openSections.background}
          onToggle={() => toggleSection('background')}
        >
          <BackgroundConfigEditor value={backgroundConfig} onChange={setBackgroundConfig} />
        </Section>

        {/* Analytics Goals Section */}
        <Section
          title={t('admin.landings.analytics', 'Analytics')}
          open={openSections.analytics}
          onToggle={() => toggleSection('analytics')}
        >
          <div className="space-y-4">
            {/* View Goal */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-dark-400">
                  {t('admin.landings.viewGoal', 'View goal')}
                </label>
                <input
                  type="text"
                  value={analyticsViewGoal}
                  onChange={(e) => setAnalyticsViewGoal(e.target.value)}
                  disabled={!analyticsViewEnabled}
                  className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500 disabled:opacity-50"
                  placeholder="landing_view"
                />
              </div>
              <Toggle
                checked={analyticsViewEnabled}
                onChange={() => setAnalyticsViewEnabled((v) => !v)}
              />
            </div>

            {/* Click Goal */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-dark-400">
                  {t('admin.landings.clickGoal', 'Payment click goal')}
                </label>
                <input
                  type="text"
                  value={analyticsClickGoal}
                  onChange={(e) => setAnalyticsClickGoal(e.target.value)}
                  disabled={!analyticsClickEnabled}
                  className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500 disabled:opacity-50"
                  placeholder="landing_pay"
                />
              </div>
              <Toggle
                checked={analyticsClickEnabled}
                onChange={() => setAnalyticsClickEnabled((v) => !v)}
              />
            </div>
            {/* Sticky pay button on mobile */}
            <div className="flex items-center justify-between gap-4 border-t border-dark-800 pt-4">
              <div>
                <p className="text-sm text-dark-300">
                  {t('admin.landings.stickyPayButton', 'Sticky pay button (mobile)')}
                </p>
                <p className="text-xs text-dark-500">
                  {t(
                    'admin.landings.stickyPayButtonHint',
                    'Button pinned to bottom of screen on mobile',
                  )}
                </p>
              </div>
              <Toggle checked={stickyPayButton} onChange={() => setStickyPayButton((v) => !v)} />
            </div>
          </div>
        </Section>

        {/* Footer & Custom CSS Section */}
        <Section
          title={t('admin.landings.content')}
          open={openSections.footer}
          onToggle={() => toggleSection('footer')}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-dark-400">
                {t('admin.landings.footerText')}
              </label>
              <LocalizedInput
                value={footerText}
                onChange={setFooterText}
                locale={editingLocale}
                multiline
                rows={4}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-dark-400">
                {t('admin.landings.customCss')}
              </label>
              <textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 font-mono text-sm text-dark-100 outline-none focus:border-accent-500"
              />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
