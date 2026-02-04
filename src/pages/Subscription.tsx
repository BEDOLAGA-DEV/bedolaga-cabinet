import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { subscriptionApi } from '../api/subscription';
import { promoApi } from '../api/promo';
import type {
  PurchaseSelection,
  PeriodOption,
  Tariff,
  TariffPeriod,
  ClassicPurchaseOptions,
} from '../types';
import ConnectionModal from '../components/ConnectionModal';
import InsufficientBalancePrompt from '../components/InsufficientBalancePrompt';
import { useCurrency } from '../hooks/useCurrency';
import { useCloseOnSuccessNotification } from '../store/successNotification';
import i18n from '../i18n';

// Helper to extract error message from axios/api errors
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && detail?.message) return detail.message;
  }
  if (error instanceof Error) return error.message;
  return i18n.t('common.error');
};

// Helper to extract insufficient balance error details
const getInsufficientBalanceError = (
  error: unknown,
): { required: number; balance: number; missingAmount?: number } | null => {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    // Support both 'insufficient_balance' and 'insufficient_funds' codes
    if (
      typeof detail === 'object' &&
      (detail?.code === 'insufficient_balance' || detail?.code === 'insufficient_funds')
    ) {
      return {
        required: detail.required || detail.total_price || 0,
        balance: detail.balance || 0,
        missingAmount: detail.missing_amount || detail.missingAmount || 0,
      };
    }
  }
  return null;
};

// Icons
const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// Convert country code to flag emoji
const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

type PurchaseStep = 'period' | 'traffic' | 'servers' | 'devices' | 'confirm';

export default function Subscription() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { formatAmount, currencySymbol } = useCurrency();
  const [copied, setCopied] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Helper to format price from kopeks
  const formatPrice = (kopeks: number) => `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  // Helper to apply promo discount to a price
  const applyPromoDiscount = (
    priceKopeks: number,
    hasExistingDiscount: boolean = false,
  ): {
    price: number;
    original: number | null;
    percent: number | null;
  } => {
    // Only apply promo discount if no existing discount (from promo group) and we have an active promo discount
    if (!activeDiscount?.is_active || !activeDiscount.discount_percent || hasExistingDiscount) {
      return { price: priceKopeks, original: null, percent: null };
    }
    const discountedPrice = Math.round(priceKopeks * (1 - activeDiscount.discount_percent / 100));
    return {
      price: discountedPrice,
      original: priceKopeks,
      percent: activeDiscount.discount_percent,
    };
  };

  // Purchase state (classic mode)
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('period');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption | null>(null);
  const [selectedTraffic, setSelectedTraffic] = useState<number | null>(null);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<number>(1);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  // Tariffs mode state
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [selectedTariffPeriod, setSelectedTariffPeriod] = useState<TariffPeriod | null>(null);
  const [showTariffPurchase, setShowTariffPurchase] = useState(false);
  // Custom days/traffic state
  const [customDays, setCustomDays] = useState<number>(30);
  const [customTrafficGb, setCustomTrafficGb] = useState<number>(50);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [useCustomTraffic, setUseCustomTraffic] = useState(false);
  // Device/traffic topup state
  const [showDeviceTopup, setShowDeviceTopup] = useState(false);
  const [devicesToAdd, setDevicesToAdd] = useState(1);
  const [showDeviceReduction, setShowDeviceReduction] = useState(false);
  const [targetDeviceLimit, setTargetDeviceLimit] = useState<number>(1);
  const [showTrafficTopup, setShowTrafficTopup] = useState(false);
  const [selectedTrafficPackage, setSelectedTrafficPackage] = useState<number | null>(null);
  const [showServerManagement, setShowServerManagement] = useState(false);
  const [selectedServersToUpdate, setSelectedServersToUpdate] = useState<string[]>([]);

  // Traffic refresh state
  const [trafficRefreshCooldown, setTrafficRefreshCooldown] = useState(0);
  const [trafficData, setTrafficData] = useState<{
    traffic_used_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
  } | null>(null);

  const { data: subscriptionResponse, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getSubscription,
    retry: false,
    staleTime: 0, // Always refetch to get latest data
    refetchOnMount: 'always',
  });

  // Extract subscription from response (null if no subscription)
  const subscription = subscriptionResponse?.subscription ?? null;

  const { data: purchaseOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ['purchase-options'],
    queryFn: subscriptionApi.getPurchaseOptions,
  });

  // Fetch active promo discount
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
  });

  // Check if in tariffs mode (moved up to be available for useEffect)
  const isTariffsMode = purchaseOptions?.sales_mode === 'tariffs';
  const classicOptions = !isTariffsMode ? (purchaseOptions as ClassicPurchaseOptions) : null;
  const tariffs =
    isTariffsMode && purchaseOptions && 'tariffs' in purchaseOptions ? purchaseOptions.tariffs : [];

  // Determine which steps are needed
  const steps = useMemo<PurchaseStep[]>(() => {
    const result: PurchaseStep[] = ['period'];
    if (selectedPeriod?.traffic.selectable && (selectedPeriod.traffic.options?.length ?? 0) > 0) {
      result.push('traffic');
    }
    if (
      selectedPeriod &&
      (selectedPeriod.servers.options?.filter((s) => s.is_available).length ?? 0) > 0
    ) {
      result.push('servers');
    }
    if (selectedPeriod && selectedPeriod.devices.max > selectedPeriod.devices.min) {
      result.push('devices');
    }
    result.push('confirm');
    return result;
  }, [selectedPeriod]);

  const currentStepIndex = steps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Initialize selection from options (classic mode only)
  useEffect(() => {
    if (classicOptions && !selectedPeriod) {
      const defaultPeriod =
        classicOptions.periods.find((p) => p.id === classicOptions.selection.period_id) ||
        classicOptions.periods[0];
      setSelectedPeriod(defaultPeriod);
      setSelectedTraffic(classicOptions.selection.traffic_value);
      const availableServerUuids = new Set(
        defaultPeriod.servers.options?.filter((s) => s.is_available).map((s) => s.uuid) ?? [],
      );
      setSelectedServers(
        classicOptions.selection.servers.filter((uuid) => availableServerUuids.has(uuid)),
      );
      setSelectedDevices(classicOptions.selection.devices);
    }
  }, [classicOptions, selectedPeriod]);

  // Build selection object
  const currentSelection: PurchaseSelection = useMemo(
    () => ({
      period_id: selectedPeriod?.id,
      period_days: selectedPeriod?.period_days,
      traffic_value: selectedTraffic ?? undefined,
      servers: selectedServers,
      devices: selectedDevices,
    }),
    [selectedPeriod, selectedTraffic, selectedServers, selectedDevices],
  );

  // Preview query
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['purchase-preview', currentSelection],
    queryFn: () => subscriptionApi.previewPurchase(currentSelection),
    enabled: !!selectedPeriod && showPurchaseForm && currentStep === 'confirm',
  });

  const purchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.submitPurchase(currentSelection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      setShowPurchaseForm(false);
      setCurrentStep('period');
    },
  });

  const autopayMutation = useMutation({
    mutationFn: (enabled: boolean) => subscriptionApi.updateAutopay(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  // Devices query
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: subscriptionApi.getDevices,
    enabled: !!subscription,
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: (hwid: string) => subscriptionApi.deleteDevice(hwid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Delete all devices mutation
  const deleteAllDevicesMutation = useMutation({
    mutationFn: () => subscriptionApi.deleteAllDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Pause subscription mutation
  const pauseMutation = useMutation({
    mutationFn: () => subscriptionApi.togglePause(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  // Refs for auto-scroll
  const switchModalRef = useRef<HTMLDivElement>(null);
  const tariffPurchaseRef = useRef<HTMLDivElement>(null);
  const tariffsCardRef = useRef<HTMLDivElement>(null);

  // Tariff switch preview
  const [switchTariffId, setSwitchTariffId] = useState<number | null>(null);

  // Auto-close all modals/forms when success notification appears (e.g., subscription purchased via WebSocket)
  const handleCloseAllModals = useCallback(() => {
    setShowConnectionModal(false);
    setShowPurchaseForm(false);
    setShowTariffPurchase(false);
    setShowDeviceTopup(false);
    setShowDeviceReduction(false);
    setShowTrafficTopup(false);
    setShowServerManagement(false);
    setSwitchTariffId(null);
    setSelectedTariff(null);
    setSelectedTariffPeriod(null);
  }, []);
  useCloseOnSuccessNotification(handleCloseAllModals);

  const { data: switchPreview, isLoading: switchPreviewLoading } = useQuery({
    queryKey: ['tariff-switch-preview', switchTariffId],
    queryFn: () => subscriptionApi.previewTariffSwitch(switchTariffId!),
    enabled: !!switchTariffId,
  });

  // Tariff switch mutation
  const switchTariffMutation = useMutation({
    mutationFn: (tariffId: number) => subscriptionApi.switchTariff(tariffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      setSwitchTariffId(null);
    },
    onError: (error: unknown) => {
      // Handle subscription_expired error - redirect to purchase flow
      if (error instanceof AxiosError) {
        const detail = error.response?.data?.detail;
        if (
          typeof detail === 'object' &&
          detail?.error_code === 'subscription_expired' &&
          detail?.use_purchase_flow === true
        ) {
          // Find the tariff user was trying to switch to and open purchase form
          const targetTariff = tariffs.find((t) => t.id === switchTariffId);
          if (targetTariff) {
            setSwitchTariffId(null);
            setSelectedTariff(targetTariff);
            setSelectedTariffPeriod(targetTariff.periods[0] || null);
            setShowTariffPurchase(true);
            // Refetch purchase-options to get updated expired status
            queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
          }
        }
      }
    },
  });

  // Tariff purchase mutation
  const tariffPurchaseMutation = useMutation({
    mutationFn: () => {
      if (!selectedTariff) {
        throw new Error('Tariff not selected');
      }
      // For daily tariffs, always use 1 day
      const isDailyTariff =
        selectedTariff.is_daily ||
        (selectedTariff.daily_price_kopeks && selectedTariff.daily_price_kopeks > 0);
      const days = isDailyTariff
        ? 1
        : useCustomDays
          ? customDays
          : selectedTariffPeriod?.days || 30;
      const trafficGb =
        useCustomTraffic && selectedTariff.custom_traffic_enabled ? customTrafficGb : undefined;
      return subscriptionApi.purchaseTariff(selectedTariff.id, days, trafficGb);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      setShowTariffPurchase(false);
      setSelectedTariff(null);
      setSelectedTariffPeriod(null);
      setUseCustomDays(false);
      setUseCustomTraffic(false);
    },
  });

  // Device price query
  const { data: devicePriceData } = useQuery({
    queryKey: ['device-price', devicesToAdd],
    queryFn: () => subscriptionApi.getDevicePrice(devicesToAdd),
    enabled: showDeviceTopup && !!subscription,
  });

  // Device purchase mutation
  const devicePurchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.purchaseDevices(devicesToAdd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setShowDeviceTopup(false);
      setDevicesToAdd(1);
    },
  });

  // Device reduction info query
  const { data: deviceReductionInfo } = useQuery({
    queryKey: ['device-reduction-info'],
    queryFn: subscriptionApi.getDeviceReductionInfo,
    enabled: showDeviceReduction && !!subscription,
  });

  // Initialize target device limit when reduction info loads
  useEffect(() => {
    if (deviceReductionInfo && showDeviceReduction) {
      setTargetDeviceLimit(
        Math.max(
          deviceReductionInfo.min_device_limit,
          deviceReductionInfo.current_device_limit - 1,
        ),
      );
    }
  }, [deviceReductionInfo, showDeviceReduction]);

  // Device reduction mutation
  const deviceReductionMutation = useMutation({
    mutationFn: () => subscriptionApi.reduceDevices(targetDeviceLimit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-reduction-info'] });
      setShowDeviceReduction(false);
    },
  });

  // Traffic packages query
  const { data: trafficPackages } = useQuery({
    queryKey: ['traffic-packages'],
    queryFn: subscriptionApi.getTrafficPackages,
    enabled: showTrafficTopup && !!subscription,
  });

  // Traffic purchase mutation
  const trafficPurchaseMutation = useMutation({
    mutationFn: (gb: number) => subscriptionApi.purchaseTraffic(gb),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowTrafficTopup(false);
      setSelectedTrafficPackage(null);
    },
  });

  // Countries/servers query
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: subscriptionApi.getCountries,
    enabled: showServerManagement && !!subscription && !subscription.is_trial,
  });

  // Initialize selected servers when data loads
  useEffect(() => {
    if (countriesData && showServerManagement) {
      const connected = countriesData.countries.filter((c) => c.is_connected).map((c) => c.uuid);
      setSelectedServersToUpdate(connected);
    }
  }, [countriesData, showServerManagement]);

  // Countries update mutation
  const updateCountriesMutation = useMutation({
    mutationFn: (countries: string[]) => subscriptionApi.updateCountries(countries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      setShowServerManagement(false);
    },
  });

  // Traffic refresh mutation
  const refreshTrafficMutation = useMutation({
    mutationFn: subscriptionApi.refreshTraffic,
    onSuccess: (data) => {
      setTrafficData({
        traffic_used_gb: data.traffic_used_gb,
        traffic_used_percent: data.traffic_used_percent,
        is_unlimited: data.is_unlimited,
      });
      localStorage.setItem('traffic_refresh_ts', Date.now().toString());
      if (data.rate_limited && data.retry_after_seconds) {
        setTrafficRefreshCooldown(data.retry_after_seconds);
      } else {
        setTrafficRefreshCooldown(30);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error: {
      response?: { status?: number; headers?: { get?: (key: string) => string } };
    }) => {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers?.get?.('Retry-After');
        setTrafficRefreshCooldown(retryAfter ? parseInt(retryAfter, 10) : 30);
      }
    },
  });

  // Track if we've already triggered auto-refresh this session
  const hasAutoRefreshed = useRef(false);

  // Cooldown timer for traffic refresh
  useEffect(() => {
    if (trafficRefreshCooldown <= 0) return;
    const timer = setInterval(() => {
      setTrafficRefreshCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [trafficRefreshCooldown]);

  // Auto-refresh traffic on mount (with 30s caching)
  useEffect(() => {
    if (!subscription) return;
    if (hasAutoRefreshed.current) return;
    hasAutoRefreshed.current = true;

    const lastRefresh = localStorage.getItem('traffic_refresh_ts');
    const now = Date.now();
    const cacheMs = 30 * 1000;

    if (lastRefresh && now - parseInt(lastRefresh, 10) < cacheMs) {
      const elapsed = now - parseInt(lastRefresh, 10);
      const remaining = Math.ceil((cacheMs - elapsed) / 1000);
      if (remaining > 0) {
        setTrafficRefreshCooldown(remaining);
      }
      return;
    }

    refreshTrafficMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription]);

  // Auto-scroll to switch tariff modal when it appears
  useEffect(() => {
    if (switchTariffId && switchModalRef.current) {
      const timer = setTimeout(() => {
        switchModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [switchTariffId]);

  // Auto-scroll to tariff purchase form when it appears
  useEffect(() => {
    if (showTariffPurchase && tariffPurchaseRef.current) {
      const timer = setTimeout(() => {
        tariffPurchaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showTariffPurchase]);

  // Auto-scroll to tariffs section when coming from Dashboard "Продлить" button
  useEffect(() => {
    const state = location.state as { scrollToExtend?: boolean } | null;
    // Wait for tariffs to load before scrolling
    if (state?.scrollToExtend && tariffsCardRef.current && tariffs.length > 0) {
      const timer = setTimeout(() => {
        tariffsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      // Clear the state to prevent re-scrolling on subsequent renders
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location.state, tariffs.length]);

  const copyUrl = () => {
    if (subscription?.subscription_url) {
      navigator.clipboard.writeText(subscription.subscription_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTrafficColor = (percent: number) => {
    if (percent > 90) return 'bg-error-500';
    if (percent > 70) return 'bg-warning-500';
    return 'bg-success-500';
  };

  const toggleServer = (uuid: string) => {
    if (selectedServers.includes(uuid)) {
      if (selectedServers.length > 1) {
        setSelectedServers(selectedServers.filter((s) => s !== uuid));
      }
    } else {
      setSelectedServers([...selectedServers, uuid]);
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const resetPurchase = () => {
    setShowPurchaseForm(false);
    setCurrentStep('period');
  };

  const getStepLabel = (step: PurchaseStep) => {
    switch (step) {
      case 'period':
        return t('subscription.stepPeriod');
      case 'traffic':
        return t('subscription.stepTraffic');
      case 'servers':
        return t('subscription.stepServers');
      case 'devices':
        return t('subscription.stepDevices');
      case 'confirm':
        return t('subscription.stepConfirm');
    }
  };

  if (isLoading || optionsLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('subscription.title')}</h1>

      {/* Current Subscription */}
      {subscription ? (
        <div
          className={`bento-card ${subscription.is_trial ? 'border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent' : ''}`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('subscription.currentPlan')}
              </h2>
              {subscription.tariff_name && (
                <div className="mt-1 text-sm text-accent-400">{subscription.tariff_name}</div>
              )}
            </div>
            <span
              className={
                subscription.is_active
                  ? subscription.is_trial
                    ? 'badge-warning'
                    : 'badge-success'
                  : 'badge-error'
              }
            >
              {subscription.is_trial
                ? t('subscription.trialStatus')
                : subscription.is_active
                  ? t('subscription.active')
                  : t('subscription.expired')}
            </span>
          </div>

          {/* Trial Period Info Banner */}
          {subscription.is_trial && subscription.is_active && (
            <div className="mb-6 rounded-xl border border-warning-500/30 bg-warning-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-warning-500/20 text-lg">
                  <svg
                    className="h-5 w-5 text-warning-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-warning-300">
                    {t('subscription.trialInfo.title')}
                  </div>
                  <div className="mt-1 text-sm text-dark-400">
                    {t('subscription.trialInfo.description')}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-warning-400">
                        {subscription.days_left > 0
                          ? t('subscription.days', { count: subscription.days_left })
                          : `${subscription.hours_left}${t('subscription.hours')} ${subscription.minutes_left}${t('subscription.minutes')}`}
                      </span>
                      <span className="text-dark-500">{t('subscription.trialInfo.remaining')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-warning-400">
                        {subscription.traffic_limit_gb || '∞'} GB
                      </span>
                      <span className="text-dark-500">{t('subscription.traffic')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-warning-400">{subscription.device_limit}</span>
                      <span className="text-dark-500">{t('subscription.devices')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connection Data - Top Priority */}
          {subscription.subscription_url && (
            <div className="mb-6 rounded-xl border border-accent-500/30 bg-accent-500/10 p-4">
              <div className="mb-3 font-medium text-dark-100">
                {t('subscription.connectionInfo')}
              </div>

              {/* Get Config Button */}
              <button
                onClick={() => setShowConnectionModal(true)}
                className="btn-primary mb-3 flex w-full items-center justify-center gap-2 py-3"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                {t('subscription.getConfig')}
              </button>

              {/* Subscription URL - hidden when hide_subscription_link is true */}
              {!subscription.hide_subscription_link && (
                <div className="flex gap-2">
                  <code className="scrollbar-hide flex-1 overflow-x-auto break-all rounded-lg border border-dark-700/50 bg-dark-900/50 px-3 py-2 text-xs text-dark-300">
                    {subscription.subscription_url}
                  </code>
                  <button
                    onClick={copyUrl}
                    className={`btn-secondary px-3 ${copied ? 'border-success-500/30 text-success-400' : ''}`}
                    title={t('subscription.copyLink')}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <div className="mb-1 text-sm text-dark-500">{t('subscription.daysLeft')}</div>
              <div className="text-xl font-semibold text-dark-100">
                {subscription.days_left > 0 ? (
                  t('subscription.days', { count: subscription.days_left })
                ) : subscription.hours_left > 0 ? (
                  `${t('subscription.hours', { count: subscription.hours_left })} ${t('subscription.minutes', { count: subscription.minutes_left })}`
                ) : subscription.minutes_left > 0 ? (
                  t('subscription.minutes', { count: subscription.minutes_left })
                ) : (
                  <span className="text-error-400">{t('subscription.expired')}</span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1 text-sm text-dark-500">{t('subscription.expiresAt')}</div>
              <div className="text-xl font-semibold text-dark-100">
                {new Date(subscription.end_date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm text-dark-500">{t('subscription.traffic')}</span>
                <button
                  onClick={() => refreshTrafficMutation.mutate()}
                  disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
                  className="rounded-full p-1 text-dark-400 transition-colors hover:bg-dark-700/50 hover:text-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')
                  }
                >
                  <svg
                    className={`h-3.5 w-3.5 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
              <div className="text-xl font-semibold text-dark-100">
                {(trafficData?.traffic_used_gb ?? subscription.traffic_used_gb).toFixed(1)} /{' '}
                {subscription.traffic_limit_gb || '∞'} GB
              </div>
            </div>
            <div>
              <div className="mb-1 text-sm text-dark-500">{t('subscription.devices')}</div>
              <div className="text-xl font-semibold text-dark-100">{subscription.device_limit}</div>
            </div>
          </div>

          {/* Servers */}
          {subscription.servers && subscription.servers.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 text-sm text-dark-500">{t('subscription.serversLabel')}</div>
              <div className="flex flex-wrap gap-2">
                {subscription.servers.map((server) => (
                  <span
                    key={server.uuid}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dark-700/50 bg-dark-800/50 px-3 py-1.5 text-sm text-dark-200"
                  >
                    {server.country_code && (
                      <span className="text-base">{getFlagEmoji(server.country_code)}</span>
                    )}
                    {server.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Traffic Usage */}
          {subscription.traffic_limit_gb > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-dark-400">{t('subscription.trafficUsed')}</span>
                <span className="text-dark-300">
                  {(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent).toFixed(
                    1,
                  )}
                  %
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getTrafficColor(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent)}`}
                  style={{
                    width: `${Math.min(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Purchased Traffic Packages */}
          {subscription.traffic_purchases && subscription.traffic_purchases.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 text-sm text-dark-500">{t('subscription.purchasedTraffic')}</div>
              <div className="space-y-3">
                {subscription.traffic_purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="rounded-lg border border-dark-700/50 bg-dark-800/50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-5 w-5 text-accent-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <span className="text-base font-semibold text-dark-100">
                          {purchase.traffic_gb} {t('common.units.gb')}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-sm text-dark-400">
                          {purchase.days_remaining === 0 ? (
                            <span className="text-orange-500">{t('subscription.expired')}</span>
                          ) : (
                            <span>
                              {t('subscription.days', { count: purchase.days_remaining })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-dark-500">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>
                            {t('subscription.trafficResetAt')}:{' '}
                            {new Date(purchase.expires_at).toLocaleDateString(undefined, {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-dark-700">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-accent-500 to-accent-600 transition-all duration-300"
                        style={{ width: `${purchase.progress_percent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-dark-500">
                      <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                      <span>{new Date(purchase.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Autopay Toggle - hide for daily tariffs */}
          {!subscription.is_trial && !subscription.is_daily && (
            <div className="flex items-center justify-between border-t border-dark-800/50 py-4">
              <div>
                <div className="font-medium text-dark-100">{t('subscription.autoRenewal')}</div>
                <div className="text-sm text-dark-500">
                  {t('subscription.daysBeforeExpiry', { count: subscription.autopay_days_before })}
                </div>
              </div>
              <button
                onClick={() => autopayMutation.mutate(!subscription.autopay_enabled)}
                disabled={autopayMutation.isPending}
                className={`relative h-6 w-12 rounded-full transition-colors ${
                  subscription.autopay_enabled ? 'bg-accent-500' : 'bg-dark-700'
                }`}
              >
                <span
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    subscription.autopay_enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
            <svg
              className="h-8 w-8 text-dark-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <div className="mb-4 text-dark-400">{t('subscription.noSubscription')}</div>
        </div>
      )}

      {/* Daily Subscription Pause */}
      {subscription && subscription.is_daily && !subscription.is_trial && (
        <div className="bento-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('subscription.pause.title')}
              </h2>
              <div className="mt-1 text-sm text-dark-400">
                {subscription.is_daily_paused
                  ? t('subscription.pause.paused')
                  : t('subscription.pause.active')}
              </div>
            </div>
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                subscription.is_daily_paused
                  ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                  : 'bg-warning-500/20 text-warning-400 hover:bg-warning-500/30'
              }`}
            >
              {pauseMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="border-current/30 h-4 w-4 animate-spin rounded-full border-2 border-t-current" />
                </span>
              ) : subscription.is_daily_paused ? (
                t('subscription.pause.resumeBtn')
              ) : (
                t('subscription.pause.pauseBtn')
              )}
            </button>
          </div>

          {/* Pause mutation error */}
          {pauseMutation.isError &&
            (() => {
              const balanceError = getInsufficientBalanceError(pauseMutation.error);
              if (balanceError) {
                const missingAmount = balanceError.required - balanceError.balance;
                return (
                  <div className="mt-4">
                    <InsufficientBalancePrompt
                      missingAmountKopeks={missingAmount}
                      message={t('subscription.pause.insufficientBalance')}
                      compact
                    />
                  </div>
                );
              }
              return (
                <div className="mt-4 rounded-lg bg-error-500/10 px-4 py-3 text-center text-sm text-error-400">
                  {getErrorMessage(pauseMutation.error)}
                </div>
              );
            })()}

          {/* Paused info or Next charge progress bar */}
          {subscription.is_daily_paused ? (
            <div className="mt-4 border-t border-dark-800/50 pt-4">
              <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-xl text-warning-400">⏸️</div>
                  <div>
                    <div className="font-medium text-warning-300">
                      {t('subscription.pause.pausedInfo')}
                    </div>
                    <div className="mt-1 text-sm text-dark-400">
                      {t('subscription.pause.pausedDescription')}{' '}
                      {new Date(subscription.end_date).toLocaleDateString()} (
                      {t('subscription.pause.days', { count: subscription.days_left })})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            subscription.next_daily_charge_at &&
            (() => {
              const now = new Date();
              // Backend returns UTC datetime, ensure it's parsed as UTC
              const nextChargeStr = subscription.next_daily_charge_at.endsWith('Z')
                ? subscription.next_daily_charge_at
                : subscription.next_daily_charge_at + 'Z';
              const nextCharge = new Date(nextChargeStr);
              const totalMs = 24 * 60 * 60 * 1000; // 24 hours in ms
              const remainingMs = Math.max(0, nextCharge.getTime() - now.getTime());
              const elapsedMs = totalMs - remainingMs;
              const progress = Math.min(100, (elapsedMs / totalMs) * 100);

              const hours = Math.floor(remainingMs / (1000 * 60 * 60));
              const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

              return (
                <div className="mt-4 border-t border-dark-800/50 pt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-dark-400">{t('subscription.pause.nextCharge')}</span>
                    <span className="font-medium text-dark-200">
                      {hours > 0
                        ? `${hours}${t('subscription.pause.hours')} ${minutes}${t('subscription.pause.minutes')}`
                        : `${minutes}${t('subscription.pause.minutes')}`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-dark-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {subscription.daily_price_kopeks && (
                    <div className="mt-2 text-center text-xs text-dark-500">
                      {t('subscription.pause.willBeCharged')}:{' '}
                      {formatPrice(subscription.daily_price_kopeks)}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Additional Options (Buy Devices) */}
      {subscription && subscription.is_active && !subscription.is_trial && (
        <div className="bento-card">
          <h2 className="mb-4 text-lg font-semibold text-dark-100">
            {t('subscription.additionalOptions.title')}
          </h2>

          {/* Buy Devices */}
          {!showDeviceTopup ? (
            <button
              onClick={() => setShowDeviceTopup(true)}
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/30 p-4 text-left transition-colors hover:border-dark-600"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-dark-100">
                    {t('subscription.additionalOptions.buyDevices')}
                  </div>
                  <div className="mt-1 text-sm text-dark-400">
                    {t('subscription.additionalOptions.currentDeviceLimit', {
                      count: subscription.device_limit,
                    })}
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-dark-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-dark-100">{t('subscription.buyDevices')}</h3>
                <button
                  onClick={() => setShowDeviceTopup(false)}
                  className="text-sm text-dark-400 hover:text-dark-200"
                >
                  ✕
                </button>
              </div>

              {/* Check if completely unavailable (no subscription, price not set, etc.) */}
              {devicePriceData?.available === false && !devicePriceData?.max_device_limit ? (
                <div className="py-4 text-center text-sm text-dark-400">
                  {devicePriceData.reason || t('subscription.additionalOptions.devicesUnavailable')}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Device selector - show even at max limit */}
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => setDevicesToAdd(Math.max(1, devicesToAdd - 1))}
                      disabled={devicesToAdd <= 1}
                      className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
                    >
                      -
                    </button>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-dark-100">{devicesToAdd}</div>
                      <div className="text-sm text-dark-500">
                        {t('subscription.additionalOptions.devicesUnit')}
                      </div>
                    </div>
                    <button
                      onClick={() => setDevicesToAdd(devicesToAdd + 1)}
                      disabled={
                        devicePriceData?.max_device_limit
                          ? (devicePriceData.current_device_limit || 0) + devicesToAdd >=
                            devicePriceData.max_device_limit
                          : false
                      }
                      className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
                    >
                      +
                    </button>
                  </div>

                  {/* Show limit info when at or near max */}
                  {devicePriceData?.max_device_limit && (
                    <div className="text-center text-sm text-dark-400">
                      {t('subscription.additionalOptions.currentDeviceLimit', {
                        count: devicePriceData.current_device_limit || subscription.device_limit,
                      })}{' '}
                      /{' '}
                      {t('subscription.additionalOptions.maxDevices', {
                        count: devicePriceData.max_device_limit,
                      })}
                    </div>
                  )}

                  {/* Show reason if can't add requested amount */}
                  {devicePriceData?.available === false && devicePriceData?.reason && (
                    <div className="rounded-lg bg-warning-500/10 p-3 text-center text-sm text-warning-400">
                      {devicePriceData.reason}
                    </div>
                  )}

                  {/* Price info - only when available */}
                  {devicePriceData?.available && devicePriceData.price_per_device_label && (
                    <div className="text-center">
                      <div className="mb-2 text-sm text-dark-400">
                        {devicePriceData.price_per_device_label}/
                        {t('subscription.perDevice').replace('/ ', '')} (
                        {t('subscription.days', { count: devicePriceData.days_left })})
                      </div>
                      <div className="text-2xl font-bold text-accent-400">
                        {devicePriceData.total_price_label}
                      </div>
                    </div>
                  )}

                  {devicePriceData?.available &&
                    purchaseOptions &&
                    devicePriceData.total_price_kopeks &&
                    devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks && (
                      <InsufficientBalancePrompt
                        missingAmountKopeks={
                          devicePriceData.total_price_kopeks - purchaseOptions.balance_kopeks
                        }
                        compact
                        onBeforeTopUp={async () => {
                          await subscriptionApi.saveDevicesCart(devicesToAdd);
                        }}
                      />
                    )}

                  <button
                    onClick={() => devicePurchaseMutation.mutate()}
                    disabled={
                      devicePurchaseMutation.isPending ||
                      !devicePriceData?.available ||
                      !!(
                        devicePriceData?.total_price_kopeks &&
                        purchaseOptions &&
                        devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks
                      )
                    }
                    className="btn-primary w-full py-3"
                  >
                    {devicePurchaseMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      </span>
                    ) : (
                      t('subscription.additionalOptions.buy')
                    )}
                  </button>

                  {devicePurchaseMutation.isError && (
                    <div className="text-center text-sm text-error-400">
                      {getErrorMessage(devicePurchaseMutation.error)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reduce Devices */}
          <div className="mt-4">
            {!showDeviceReduction ? (
              <button
                onClick={() => setShowDeviceReduction(true)}
                className="w-full rounded-xl border border-dark-700/50 bg-dark-800/30 p-4 text-left transition-colors hover:border-dark-600"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-dark-100">
                      {t('subscription.additionalOptions.reduceDevices')}
                    </div>
                    <div className="mt-1 text-sm text-dark-400">
                      {t('subscription.additionalOptions.reduceDevicesDescription')}
                    </div>
                  </div>
                  <svg
                    className="h-5 w-5 text-dark-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-dark-100">
                    {t('subscription.additionalOptions.reduceDevicesTitle')}
                  </h3>
                  <button
                    onClick={() => setShowDeviceReduction(false)}
                    className="text-sm text-dark-400 hover:text-dark-200"
                  >
                    ✕
                  </button>
                </div>

                {deviceReductionInfo?.available === false ? (
                  <div className="py-4 text-center text-sm text-dark-400">
                    {deviceReductionInfo.reason ||
                      t('subscription.additionalOptions.reduceUnavailable')}
                  </div>
                ) : deviceReductionInfo ? (
                  <div className="space-y-4">
                    {/* Device limit selector */}
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() =>
                          setTargetDeviceLimit(
                            Math.max(
                              Math.max(
                                deviceReductionInfo.min_device_limit,
                                deviceReductionInfo.connected_devices_count,
                              ),
                              targetDeviceLimit - 1,
                            ),
                          )
                        }
                        disabled={
                          targetDeviceLimit <=
                          Math.max(
                            deviceReductionInfo.min_device_limit,
                            deviceReductionInfo.connected_devices_count,
                          )
                        }
                        className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
                      >
                        -
                      </button>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-dark-100">{targetDeviceLimit}</div>
                        <div className="text-sm text-dark-500">
                          {t('subscription.additionalOptions.devicesUnit')}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setTargetDeviceLimit(
                            Math.min(
                              deviceReductionInfo.current_device_limit - 1,
                              targetDeviceLimit + 1,
                            ),
                          )
                        }
                        disabled={targetDeviceLimit >= deviceReductionInfo.current_device_limit - 1}
                        className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
                      >
                        +
                      </button>
                    </div>

                    {/* Info */}
                    <div className="space-y-1 text-center text-sm text-dark-400">
                      <div>
                        {t('subscription.additionalOptions.currentDeviceLimit', {
                          count: deviceReductionInfo.current_device_limit,
                        })}
                      </div>
                      <div>
                        {t('subscription.additionalOptions.minDeviceLimit', {
                          count: deviceReductionInfo.min_device_limit,
                        })}
                      </div>
                      <div>
                        {t('subscription.additionalOptions.connectedDevices', {
                          count: deviceReductionInfo.connected_devices_count,
                        })}
                      </div>
                    </div>

                    {/* Warning if connected devices block reduction */}
                    {deviceReductionInfo.connected_devices_count >
                      deviceReductionInfo.min_device_limit && (
                      <div className="rounded-lg bg-warning-500/10 p-3 text-center text-sm text-warning-400">
                        {t('subscription.additionalOptions.disconnectDevicesFirst', {
                          count: deviceReductionInfo.connected_devices_count,
                        })}
                      </div>
                    )}

                    {/* New limit preview */}
                    <div className="text-center">
                      <div className="text-sm text-dark-400">
                        {t('subscription.additionalOptions.newDeviceLimit', {
                          count: targetDeviceLimit,
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => deviceReductionMutation.mutate()}
                      disabled={
                        deviceReductionMutation.isPending ||
                        targetDeviceLimit >= deviceReductionInfo.current_device_limit ||
                        targetDeviceLimit < deviceReductionInfo.min_device_limit ||
                        targetDeviceLimit < deviceReductionInfo.connected_devices_count
                      }
                      className="btn-primary w-full py-3"
                    >
                      {deviceReductionMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {t('subscription.additionalOptions.reducing')}
                        </span>
                      ) : (
                        t('subscription.additionalOptions.reduce')
                      )}
                    </button>

                    {deviceReductionMutation.isError && (
                      <div className="text-center text-sm text-error-400">
                        {getErrorMessage(deviceReductionMutation.error)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-400/30 border-t-accent-400" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buy Traffic */}
          {subscription.traffic_limit_gb > 0 && (
            <div className="mt-4">
              {!showTrafficTopup ? (
                <button
                  onClick={() => setShowTrafficTopup(true)}
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/30 p-4 text-left transition-colors hover:border-dark-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-dark-100">
                        {t('subscription.additionalOptions.buyTraffic')}
                      </div>
                      <div className="mt-1 text-sm text-dark-400">
                        {t('subscription.additionalOptions.currentTrafficLimit', {
                          limit: subscription.traffic_limit_gb,
                          used: subscription.traffic_used_gb.toFixed(1),
                        })}
                      </div>
                    </div>
                    <svg
                      className="h-5 w-5 text-dark-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium text-dark-100">
                      {t('subscription.additionalOptions.buyTrafficTitle')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowTrafficTopup(false);
                        setSelectedTrafficPackage(null);
                      }}
                      className="text-sm text-dark-400 hover:text-dark-200"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-4 rounded-lg bg-dark-700/30 p-2 text-xs text-dark-500">
                    ⚠️ {t('subscription.additionalOptions.trafficWarning')}
                  </div>

                  {!trafficPackages || trafficPackages.length === 0 ? (
                    <div className="py-4 text-center text-sm text-dark-400">
                      {t('subscription.additionalOptions.trafficUnavailable')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {trafficPackages.map((pkg) => (
                          <button
                            key={pkg.gb}
                            onClick={() => setSelectedTrafficPackage(pkg.gb)}
                            className={`rounded-xl border p-4 text-center transition-all ${
                              selectedTrafficPackage === pkg.gb
                                ? 'border-accent-500 bg-accent-500/10'
                                : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600'
                            }`}
                          >
                            <div className="text-lg font-semibold text-dark-100">
                              {pkg.is_unlimited
                                ? '♾️ ' + t('subscription.additionalOptions.unlimited')
                                : `${pkg.gb} ${t('common.units.gb')}`}
                            </div>
                            <div className="font-medium text-accent-400">
                              {formatPrice(pkg.price_kopeks)}
                            </div>
                          </button>
                        ))}
                      </div>

                      {selectedTrafficPackage &&
                        (() => {
                          const selectedPkg = trafficPackages.find(
                            (p) => p.gb === selectedTrafficPackage,
                          );
                          const hasEnoughBalance =
                            !selectedPkg ||
                            !purchaseOptions ||
                            selectedPkg.price_kopeks <= purchaseOptions.balance_kopeks;
                          const missingAmount =
                            selectedPkg && purchaseOptions
                              ? selectedPkg.price_kopeks - purchaseOptions.balance_kopeks
                              : 0;

                          return (
                            <>
                              {!hasEnoughBalance && missingAmount > 0 && (
                                <InsufficientBalancePrompt
                                  missingAmountKopeks={missingAmount}
                                  compact
                                  className="mb-3"
                                  onBeforeTopUp={async () => {
                                    await subscriptionApi.saveTrafficCart(selectedTrafficPackage);
                                  }}
                                />
                              )}
                              <button
                                onClick={() =>
                                  trafficPurchaseMutation.mutate(selectedTrafficPackage)
                                }
                                disabled={trafficPurchaseMutation.isPending || !hasEnoughBalance}
                                className="btn-primary w-full py-3"
                              >
                                {trafficPurchaseMutation.isPending ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                  </span>
                                ) : (
                                  t('subscription.additionalOptions.buyTrafficGb', {
                                    gb: selectedTrafficPackage,
                                  })
                                )}
                              </button>
                            </>
                          );
                        })()}

                      {trafficPurchaseMutation.isError && (
                        <div className="text-center text-sm text-error-400">
                          {getErrorMessage(trafficPurchaseMutation.error)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Server Management - only in classic mode */}
          {!isTariffsMode && (
            <div className="mt-4">
              {!showServerManagement ? (
                <button
                  onClick={() => setShowServerManagement(true)}
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/30 p-4 text-left transition-colors hover:border-dark-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-dark-100">
                        {t('subscription.additionalOptions.manageServers')}
                      </div>
                      <div className="mt-1 text-sm text-dark-400">
                        {t('subscription.servers', { count: subscription.servers?.length || 0 })}
                      </div>
                    </div>
                    <svg
                      className="h-5 w-5 text-dark-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium text-dark-100">
                      {t('subscription.additionalOptions.manageServersTitle')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowServerManagement(false);
                        setSelectedServersToUpdate([]);
                      }}
                      className="text-sm text-dark-400 hover:text-dark-200"
                    >
                      ✕
                    </button>
                  </div>

                  {countriesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                    </div>
                  ) : countriesData && countriesData.countries.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-dark-700/30 p-2 text-xs text-dark-500">
                        {t('subscription.serverManagement.statusLegend')}
                      </div>

                      {countriesData.discount_percent > 0 && (
                        <div className="rounded-lg border border-success-500/30 bg-success-500/10 p-2 text-xs text-success-400">
                          🎁{' '}
                          {t('subscription.serverManagement.discountBanner', {
                            percent: countriesData.discount_percent,
                          })}
                        </div>
                      )}

                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {countriesData.countries
                          .filter((country) => country.is_available || country.is_connected)
                          .map((country) => {
                            const isCurrentlyConnected = country.is_connected;
                            const isSelected = selectedServersToUpdate.includes(country.uuid);
                            const willBeAdded = !isCurrentlyConnected && isSelected;
                            const willBeRemoved = isCurrentlyConnected && !isSelected;

                            return (
                              <button
                                key={country.uuid}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedServersToUpdate((prev) =>
                                      prev.filter((u) => u !== country.uuid),
                                    );
                                  } else {
                                    setSelectedServersToUpdate((prev) => [...prev, country.uuid]);
                                  }
                                }}
                                disabled={!country.is_available && !isCurrentlyConnected}
                                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                  isSelected
                                    ? willBeAdded
                                      ? 'border-success-500 bg-success-500/10'
                                      : 'border-accent-500 bg-accent-500/10'
                                    : willBeRemoved
                                      ? 'border-error-500/50 bg-error-500/5'
                                      : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600'
                                } ${!country.is_available && !isCurrentlyConnected ? 'cursor-not-allowed opacity-50' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">
                                    {willBeAdded
                                      ? '➕'
                                      : willBeRemoved
                                        ? '➖'
                                        : isSelected
                                          ? '✅'
                                          : '⚪'}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2 font-medium text-dark-100">
                                      {country.name}
                                      {country.has_discount && !isCurrentlyConnected && (
                                        <span className="rounded bg-success-500/20 px-1.5 py-0.5 text-xs text-success-400">
                                          -{country.discount_percent}%
                                        </span>
                                      )}
                                    </div>
                                    {willBeAdded && (
                                      <div className="text-xs text-success-400">
                                        +{formatPrice(country.price_kopeks)}{' '}
                                        {t('subscription.serverManagement.forDays', {
                                          days: countriesData.days_left,
                                        })}
                                        {country.has_discount && (
                                          <span className="ml-1 text-dark-500 line-through">
                                            {formatPrice(
                                              Math.round(
                                                (country.base_price_kopeks *
                                                  countriesData.days_left) /
                                                  30,
                                              ),
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {!willBeAdded && !isCurrentlyConnected && (
                                      <div className="text-xs text-dark-500">
                                        {formatPrice(country.price_per_month_kopeks)}
                                        {t('subscription.serverManagement.perMonth')}
                                        {country.has_discount && (
                                          <span className="ml-1 text-dark-600 line-through">
                                            {formatPrice(country.base_price_kopeks)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {!country.is_available && !isCurrentlyConnected && (
                                      <div className="text-xs text-dark-500">
                                        {t('subscription.serverManagement.unavailable')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {country.country_code && (
                                  <span className="text-xl">
                                    {getFlagEmoji(country.country_code)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </div>

                      {(() => {
                        const currentConnected = countriesData.countries
                          .filter((c) => c.is_connected)
                          .map((c) => c.uuid);
                        const added = selectedServersToUpdate.filter(
                          (u) => !currentConnected.includes(u),
                        );
                        const removed = currentConnected.filter(
                          (u) => !selectedServersToUpdate.includes(u),
                        );
                        const hasChanges = added.length > 0 || removed.length > 0;

                        // Calculate cost for added servers
                        const addedServers = countriesData.countries.filter((c) =>
                          added.includes(c.uuid),
                        );
                        const totalCost = addedServers.reduce((sum, s) => sum + s.price_kopeks, 0);
                        const hasEnoughBalance =
                          !purchaseOptions || totalCost <= purchaseOptions.balance_kopeks;
                        const missingAmount = purchaseOptions
                          ? totalCost - purchaseOptions.balance_kopeks
                          : 0;

                        return hasChanges ? (
                          <div className="space-y-3 border-t border-dark-700/50 pt-3">
                            {added.length > 0 && (
                              <div className="text-sm">
                                <span className="text-success-400">
                                  {t('subscription.serverManagement.toAdd')}
                                </span>{' '}
                                <span className="text-dark-300">
                                  {addedServers.map((s) => s.name).join(', ')}
                                </span>
                              </div>
                            )}
                            {removed.length > 0 && (
                              <div className="text-sm">
                                <span className="text-error-400">
                                  {t('subscription.serverManagement.toDisconnect')}
                                </span>{' '}
                                <span className="text-dark-300">
                                  {countriesData.countries
                                    .filter((c) => removed.includes(c.uuid))
                                    .map((s) => s.name)
                                    .join(', ')}
                                </span>
                              </div>
                            )}
                            {totalCost > 0 && (
                              <div className="text-center">
                                <div className="text-sm text-dark-400">
                                  {t('subscription.serverManagement.paymentProrated')}
                                </div>
                                <div className="text-xl font-bold text-accent-400">
                                  {formatPrice(totalCost)}
                                </div>
                              </div>
                            )}

                            {totalCost > 0 && !hasEnoughBalance && missingAmount > 0 && (
                              <InsufficientBalancePrompt
                                missingAmountKopeks={missingAmount}
                                compact
                              />
                            )}

                            <button
                              onClick={() =>
                                updateCountriesMutation.mutate(selectedServersToUpdate)
                              }
                              disabled={
                                updateCountriesMutation.isPending ||
                                selectedServersToUpdate.length === 0 ||
                                (totalCost > 0 && !hasEnoughBalance)
                              }
                              className="btn-primary w-full py-3"
                            >
                              {updateCountriesMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                </span>
                              ) : (
                                t('subscription.serverManagement.applyChanges')
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-sm text-dark-500">
                            {t('subscription.serverManagement.selectServersHint')}
                          </div>
                        );
                      })()}

                      {updateCountriesMutation.isError && (
                        <div className="text-center text-sm text-error-400">
                          {getErrorMessage(updateCountriesMutation.error)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm text-dark-400">
                      {t('subscription.serverManagement.noServersAvailable')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* My Devices Section */}
      {subscription && (
        <div className="bento-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark-100">{t('subscription.myDevices')}</h2>
            {devicesData && devicesData.devices.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(t('subscription.confirmDeleteAllDevices'))) {
                    deleteAllDevicesMutation.mutate();
                  }
                }}
                disabled={deleteAllDevicesMutation.isPending}
                className="text-sm text-error-400 hover:text-error-300"
              >
                {t('subscription.deleteAllDevices')}
              </button>
            )}
          </div>

          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : devicesData && devicesData.devices.length > 0 ? (
            <div className="space-y-3">
              <div className="mb-2 text-sm text-dark-400">
                {devicesData.total} /{' '}
                {t('subscription.devices', { count: devicesData.device_limit })}
              </div>
              {devicesData.devices.map((device) => (
                <div
                  key={device.hwid}
                  className="flex items-center justify-between rounded-xl border border-dark-700/50 bg-dark-800/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-dark-700">
                      <svg
                        className="h-5 w-5 text-dark-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-dark-100">
                        {device.device_model || device.platform}
                      </div>
                      <div className="text-sm text-dark-500">{device.platform}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(t('subscription.confirmDeleteDevice'))) {
                        deleteDeviceMutation.mutate(device.hwid);
                      }
                    }}
                    disabled={deleteDeviceMutation.isPending}
                    className="p-2 text-dark-400 transition-colors hover:text-error-400"
                    title={t('subscription.deleteDevice')}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-dark-400">{t('subscription.noDevices')}</div>
          )}
        </div>
      )}

      {/* Tariffs Section - Combined Purchase/Extend/Switch like MiniApp */}
      {isTariffsMode && tariffs.length > 0 && (
        <div ref={tariffsCardRef} className="bento-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark-100">
              {subscription?.is_daily && !subscription?.is_trial
                ? t('subscription.switchTariff.title')
                : subscription && !subscription.is_trial
                  ? t('subscription.extend')
                  : t('subscription.getSubscription')}
            </h2>
          </div>

          {/* Trial upgrade prompt */}
          {subscription?.is_trial && (
            <div className="mb-6 rounded-xl border border-warning-500/30 bg-gradient-to-r from-warning-500/10 to-accent-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-warning-500/20">
                  <svg
                    className="h-5 w-5 text-warning-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-warning-300">
                    {t('subscription.trialUpgrade.title')}
                  </div>
                  <div className="mt-1 text-sm text-dark-400">
                    {t('subscription.trialUpgrade.description')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expired subscription notice - prompt to purchase new tariff */}
          {isTariffsMode &&
            purchaseOptions &&
            'subscription_is_expired' in purchaseOptions &&
            purchaseOptions.subscription_is_expired && (
              <div className="mb-6 rounded-xl border border-error-500/30 bg-gradient-to-r from-error-500/10 to-warning-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-error-500/20">
                    <svg
                      className="h-5 w-5 text-error-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-error-300">
                      {t('subscription.expiredBanner.title')}
                    </div>
                    <div className="mt-1 text-sm text-dark-400">
                      {t('subscription.expiredBanner.selectTariff')}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Legacy subscription notice - if user has subscription without tariff */}
          {subscription && !subscription.is_trial && !subscription.tariff_id && (
            <div className="mb-6 rounded-xl border border-accent-500/30 bg-accent-500/10 p-4">
              <div className="mb-2 font-medium text-accent-400">
                {t('subscription.legacy.selectTariffTitle')}
              </div>
              <div className="text-sm text-dark-300">
                {t('subscription.legacy.selectTariffDescription')}
              </div>
              <div className="mt-2 text-xs text-dark-500">
                {t('subscription.legacy.currentSubContinues')}
              </div>
            </div>
          )}

          {/* Switch Tariff Preview Modal */}
          {switchTariffId && (
            <div ref={switchModalRef} className="mb-6 space-y-4 rounded-xl bg-dark-800/50 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-dark-100">
                  {t('subscription.switchTariff.title')}
                </h3>
                <button
                  onClick={() => setSwitchTariffId(null)}
                  className="text-sm text-dark-400 hover:text-dark-200"
                >
                  ✕
                </button>
              </div>

              {switchPreviewLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                </div>
              ) : (
                switchPreview &&
                (() => {
                  // Find the target tariff to get daily price info
                  const targetTariff = tariffs.find((t) => t.id === switchTariffId);
                  const dailyPrice =
                    targetTariff?.daily_price_kopeks ?? targetTariff?.price_per_day_kopeks ?? 0;
                  const isDailyTariff = dailyPrice > 0;

                  return (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-dark-300">
                          <span>{t('subscription.switchTariff.currentTariff')}</span>
                          <span className="font-medium text-dark-100">
                            {switchPreview.current_tariff_name || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between text-dark-300">
                          <span>{t('subscription.switchTariff.newTariff')}</span>
                          <span className="font-medium text-accent-400">
                            {switchPreview.new_tariff_name}
                          </span>
                        </div>
                        <div className="flex justify-between text-dark-300">
                          <span>{t('subscription.switchTariff.remainingDays')}</span>
                          <span>{switchPreview.remaining_days}</span>
                        </div>
                      </div>

                      {/* Daily tariff info */}
                      {isDailyTariff && (
                        <div className="rounded-lg border border-accent-500/30 bg-accent-500/10 p-3 text-center">
                          <div className="text-sm text-dark-300">
                            {t('subscription.switchTariff.dailyPayment')}
                          </div>
                          <div className="text-lg font-bold text-accent-400">
                            {formatPrice(dailyPrice)}
                          </div>
                          <div className="mt-1 text-xs text-dark-400">
                            {t('subscription.switchTariff.dailyChargeDescription')}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-dark-700/50 pt-3">
                        <span className="font-medium text-dark-100">
                          {t('subscription.switchTariff.upgradeCost')}
                        </span>
                        <span className="text-lg font-bold text-accent-400">
                          {switchPreview.upgrade_cost_kopeks > 0
                            ? switchPreview.upgrade_cost_label
                            : t('subscription.switchTariff.free')}
                        </span>
                      </div>

                      {!switchPreview.has_enough_balance &&
                        switchPreview.upgrade_cost_kopeks > 0 && (
                          <InsufficientBalancePrompt
                            missingAmountKopeks={switchPreview.missing_amount_kopeks}
                            compact
                          />
                        )}

                      <button
                        onClick={() => switchTariffMutation.mutate(switchTariffId)}
                        disabled={switchTariffMutation.isPending || !switchPreview.can_switch}
                        className="btn-primary w-full py-2.5"
                      >
                        {switchTariffMutation.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          </span>
                        ) : (
                          t('subscription.switchTariff.switch')
                        )}
                      </button>

                      {/* Show error (except subscription_expired which redirects to purchase) */}
                      {switchTariffMutation.isError &&
                        (() => {
                          const detail =
                            switchTariffMutation.error instanceof AxiosError
                              ? switchTariffMutation.error.response?.data?.detail
                              : null;
                          // Skip displaying if it's subscription_expired (handled by redirect)
                          if (
                            typeof detail === 'object' &&
                            detail?.error_code === 'subscription_expired'
                          ) {
                            return null;
                          }
                          return (
                            <div className="mt-3 text-center text-sm text-error-400">
                              {getErrorMessage(switchTariffMutation.error)}
                            </div>
                          );
                        })()}
                    </>
                  );
                })()
              )}
            </div>
          )}

          {!showTariffPurchase ? (
            <>
              {/* Promo group discount banner */}
              {tariffs.some((t) => t.promo_group_name) && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-success-500/30 bg-success-500/10 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-500/20 text-success-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-success-400">
                      {t('subscription.promoGroup.yourGroup', {
                        name: tariffs.find((t) => t.promo_group_name)?.promo_group_name,
                      })}
                    </div>
                    <div className="text-xs text-dark-400">
                      {t('subscription.promoGroup.personalDiscountsApplied')}
                    </div>
                  </div>
                </div>
              )}
              {/* Tariff List - current tariff first */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[...tariffs]
                  // Hide Trial tariffs for users who already have trial subscription
                  .filter((tariff) => {
                    if (subscription?.is_trial && tariff.name.toLowerCase().includes('trial')) {
                      return false;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    const aIsCurrent = a.is_current || a.id === subscription?.tariff_id;
                    const bIsCurrent = b.is_current || b.id === subscription?.tariff_id;
                    if (aIsCurrent && !bIsCurrent) return -1;
                    if (!aIsCurrent && bIsCurrent) return 1;
                    return 0;
                  })
                  .map((tariff) => {
                    const isCurrentTariff =
                      tariff.is_current || tariff.id === subscription?.tariff_id;
                    // Check if subscription is expired from purchaseOptions
                    const isSubscriptionExpired =
                      isTariffsMode &&
                      purchaseOptions &&
                      'subscription_is_expired' in purchaseOptions &&
                      purchaseOptions.subscription_is_expired === true;
                    // canSwitch only if subscription is active (not expired, not trial)
                    const canSwitch =
                      subscription &&
                      subscription.tariff_id &&
                      !isCurrentTariff &&
                      !subscription.is_trial &&
                      !isSubscriptionExpired &&
                      subscription.is_active;
                    // Если есть подписка БЕЗ tariff_id (классическая) - разрешить выбрать тариф
                    const isLegacySubscription =
                      subscription && !subscription.is_trial && !subscription.tariff_id;

                    return (
                      <div
                        key={tariff.id}
                        className={`bento-card-hover p-5 text-left transition-all ${
                          isCurrentTariff ? 'bento-card-glow border-accent-500' : ''
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <div className="text-lg font-semibold text-dark-100">{tariff.name}</div>
                            {tariff.description && (
                              <div className="mt-1 text-sm text-dark-400">{tariff.description}</div>
                            )}
                          </div>
                          {isCurrentTariff && (
                            <span className="badge-success text-xs">
                              {t('subscription.currentTariff')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {/* Traffic */}
                          <div className="flex items-center gap-1.5">
                            <svg
                              className="h-4 w-4 text-accent-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                              />
                            </svg>
                            <span className="font-medium text-dark-200">
                              {tariff.traffic_limit_label}
                            </span>
                          </div>
                          {/* Devices */}
                          <div className="flex items-center gap-1.5">
                            <svg
                              className="h-4 w-4 text-dark-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                              />
                            </svg>
                            <span className="text-dark-300">
                              {t('subscription.devices', { count: tariff.device_limit })}
                            </span>
                          </div>
                          {/* Servers */}
                          <div className="flex items-center gap-1.5">
                            <svg
                              className="h-4 w-4 text-dark-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                              />
                            </svg>
                            <span className="text-dark-300">
                              {t('subscription.servers', { count: tariff.servers_count })}
                            </span>
                          </div>
                        </div>
                        {/* Price info - daily or period-based */}
                        <div className="mt-3 border-t border-dark-700/50 pt-3 text-sm text-dark-400">
                          {(() => {
                            // Daily tariff price (is_daily + daily_price_kopeks)
                            const dailyPrice =
                              tariff.daily_price_kopeks ?? tariff.price_per_day_kopeks ?? 0;
                            const originalDailyPrice = tariff.original_daily_price_kopeks || 0;
                            const hasExistingDailyDiscount = originalDailyPrice > dailyPrice;
                            if (dailyPrice > 0) {
                              // Apply promo discount if no existing discount
                              const promoDaily = applyPromoDiscount(
                                dailyPrice,
                                hasExistingDailyDiscount,
                              );
                              return (
                                <span className="flex items-center gap-2">
                                  <span className="font-medium text-accent-400">
                                    {formatPrice(promoDaily.price)}
                                  </span>
                                  {/* Show original price from promo group or promo offer */}
                                  {(hasExistingDailyDiscount || promoDaily.original) && (
                                    <span className="text-xs text-dark-500 line-through">
                                      {formatPrice(
                                        hasExistingDailyDiscount
                                          ? originalDailyPrice
                                          : promoDaily.original!,
                                      )}
                                    </span>
                                  )}
                                  <span>{t('subscription.tariff.perDay')}</span>
                                  {/* Show discount badge */}
                                  {tariff.daily_discount_percent &&
                                  tariff.daily_discount_percent > 0 ? (
                                    <span className="rounded bg-success-500/20 px-1.5 py-0.5 text-xs text-success-400">
                                      -{tariff.daily_discount_percent}%
                                    </span>
                                  ) : (
                                    promoDaily.percent && (
                                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs text-orange-400">
                                        -{promoDaily.percent}%
                                      </span>
                                    )
                                  )}
                                </span>
                              );
                            }
                            // Period-based price
                            if (tariff.periods.length > 0) {
                              const firstPeriod = tariff.periods[0];
                              const hasExistingDiscount = !!(
                                firstPeriod?.original_price_kopeks &&
                                firstPeriod.original_price_kopeks > firstPeriod.price_kopeks
                              );
                              // Apply promo discount if no existing discount
                              const promoPeriod = applyPromoDiscount(
                                firstPeriod?.price_kopeks || 0,
                                hasExistingDiscount,
                              );
                              return (
                                <span className="flex flex-wrap items-center gap-2">
                                  <span>{t('subscription.from')}</span>
                                  <span className="font-medium text-accent-400">
                                    {formatPrice(promoPeriod.price)}
                                  </span>
                                  {/* Show original price from promo group or promo offer */}
                                  {(hasExistingDiscount || promoPeriod.original) && (
                                    <span className="text-xs text-dark-500 line-through">
                                      {formatPrice(
                                        hasExistingDiscount
                                          ? firstPeriod.original_price_kopeks!
                                          : promoPeriod.original!,
                                      )}
                                    </span>
                                  )}
                                  {/* Show discount badge */}
                                  {hasExistingDiscount && firstPeriod.discount_percent ? (
                                    <span className="rounded bg-success-500/20 px-1.5 py-0.5 text-xs text-success-400">
                                      -{firstPeriod.discount_percent}%
                                    </span>
                                  ) : (
                                    promoPeriod.percent && (
                                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs text-orange-400">
                                        -{promoPeriod.percent}%
                                      </span>
                                    )
                                  )}
                                </span>
                              );
                            }
                            // Fallback
                            return (
                              <span className="font-medium text-accent-400">
                                {t('subscription.tariff.flexiblePayment')}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex gap-2">
                          {isCurrentTariff ? (
                            /* Current tariff - extend button (hide for daily tariffs) */
                            subscription?.is_daily ? (
                              <div className="flex-1 py-2 text-center text-sm text-dark-500">
                                {t('subscription.currentTariff')}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedTariff(tariff);
                                  setSelectedTariffPeriod(tariff.periods[0] || null);
                                  setShowTariffPurchase(true);
                                }}
                                className="btn-primary flex-1 py-2 text-sm"
                              >
                                {t('subscription.extend')}
                              </button>
                            )
                          ) : isLegacySubscription ? (
                            /* Legacy subscription without tariff - allow selecting tariff for renewal */
                            <button
                              onClick={() => {
                                setSelectedTariff(tariff);
                                setSelectedTariffPeriod(tariff.periods[0] || null);
                                setShowTariffPurchase(true);
                              }}
                              className="btn-primary flex-1 py-2 text-sm"
                            >
                              {t('subscription.tariff.selectForRenewal')}
                            </button>
                          ) : canSwitch ? (
                            /* Other tariffs with existing tariff - switch button */
                            <button
                              onClick={() => setSwitchTariffId(tariff.id)}
                              className="btn-secondary flex-1 py-2 text-sm"
                            >
                              {t('subscription.switchTariff.switch')}
                            </button>
                          ) : (
                            /* No subscription or trial - purchase button */
                            <button
                              onClick={() => {
                                setSelectedTariff(tariff);
                                setSelectedTariffPeriod(tariff.periods[0] || null);
                                setShowTariffPurchase(true);
                              }}
                              className="btn-primary flex-1 py-2 text-sm"
                            >
                              {t('subscription.purchase')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            selectedTariff && (
              /* Tariff Purchase Form */
              <div ref={tariffPurchaseRef} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-dark-100">{selectedTariff.name}</h3>
                  <button
                    onClick={() => {
                      setShowTariffPurchase(false);
                      setSelectedTariff(null);
                      setSelectedTariffPeriod(null);
                    }}
                    className="text-dark-400 hover:text-dark-200"
                  >
                    ← {t('common.back')}
                  </button>
                </div>

                {/* Tariff Info */}
                <div className="rounded-xl bg-dark-800/30 p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-dark-500">{t('subscription.traffic')}:</span>
                      <span className="ml-2 text-dark-200">
                        {selectedTariff.traffic_limit_label}
                      </span>
                    </div>
                    <div>
                      <span className="text-dark-500">{t('subscription.devices')}:</span>
                      <span className="ml-2 text-dark-200">
                        {selectedTariff.device_limit}
                        {selectedTariff.extra_devices_count > 0 && (
                          <span className="ml-1 text-xs text-accent-400">
                            (+{selectedTariff.extra_devices_count})
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-dark-500">{t('subscription.serversLabel')}:</span>
                      <span className="ml-2 text-dark-200">{selectedTariff.servers_count}</span>
                    </div>
                  </div>
                  {selectedTariff.servers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTariff.servers.map((server) => (
                        <span key={server.uuid} className="badge-secondary">
                          {server.name}
                        </span>
                      ))}
                      {selectedTariff.servers_count > selectedTariff.servers.length && (
                        <span className="text-sm text-dark-500">
                          +{selectedTariff.servers_count - selectedTariff.servers.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Daily Tariff Purchase */}
                {selectedTariff.is_daily ||
                (selectedTariff.daily_price_kopeks && selectedTariff.daily_price_kopeks > 0) ? (
                  <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 p-5">
                    <div className="mb-4 text-center">
                      <div className="mb-2 text-sm text-dark-400">
                        {t('subscription.dailyPurchase.costPerDay')}
                      </div>
                      <div className="text-3xl font-bold text-accent-400">
                        {formatPrice(selectedTariff.daily_price_kopeks || 0)}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-dark-400">
                      <div className="flex items-start gap-2">
                        <span className="text-accent-400">•</span>
                        <span>{t('subscription.dailyPurchase.chargedDaily')}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-accent-400">•</span>
                        <span>{t('subscription.dailyPurchase.canPause')}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-accent-400">•</span>
                        <span>{t('subscription.dailyPurchase.pausedOnLowBalance')}</span>
                      </div>
                    </div>

                    {/* Purchase button for daily tariff */}
                    {(() => {
                      const dailyPrice = selectedTariff.daily_price_kopeks || 0;
                      const hasEnoughBalance =
                        purchaseOptions && dailyPrice <= purchaseOptions.balance_kopeks;

                      return (
                        <div className="mt-6">
                          {purchaseOptions && !hasEnoughBalance && (
                            <InsufficientBalancePrompt
                              missingAmountKopeks={dailyPrice - purchaseOptions.balance_kopeks}
                              compact
                              className="mb-4"
                            />
                          )}

                          <button
                            onClick={() => tariffPurchaseMutation.mutate()}
                            disabled={tariffPurchaseMutation.isPending}
                            className="btn-primary w-full py-3"
                          >
                            {tariffPurchaseMutation.isPending ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                {t('common.loading')}
                              </span>
                            ) : (
                              t('subscription.dailyPurchase.activate', {
                                price: formatPrice(dailyPrice),
                              })
                            )}
                          </button>

                          {tariffPurchaseMutation.isError &&
                            !getInsufficientBalanceError(tariffPurchaseMutation.error) && (
                              <div className="mt-3 text-center text-sm text-error-400">
                                {getErrorMessage(tariffPurchaseMutation.error)}
                              </div>
                            )}
                          {tariffPurchaseMutation.isError &&
                            getInsufficientBalanceError(tariffPurchaseMutation.error) && (
                              <div className="mt-3">
                                <InsufficientBalancePrompt
                                  missingAmountKopeks={
                                    getInsufficientBalanceError(tariffPurchaseMutation.error)
                                      ?.missingAmount ||
                                    dailyPrice - (purchaseOptions?.balance_kopeks || 0)
                                  }
                                  compact
                                />
                              </div>
                            )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    {/* Period Selection for non-daily tariffs */}
                    <div>
                      <div className="mb-3 text-sm text-dark-400">
                        {t('subscription.selectPeriod')}
                      </div>

                      {/* Fixed periods */}
                      {selectedTariff.periods.length > 0 && !useCustomDays && (
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {selectedTariff.periods.map((period) => {
                            const hasExistingDiscount = !!(
                              period.original_price_kopeks &&
                              period.original_price_kopeks > period.price_kopeks
                            );
                            const promoPeriod = applyPromoDiscount(
                              period.price_kopeks,
                              hasExistingDiscount,
                            );
                            const displayDiscount = hasExistingDiscount
                              ? period.discount_percent
                              : promoPeriod.percent;
                            const displayOriginal = hasExistingDiscount
                              ? period.original_price_kopeks
                              : promoPeriod.original;
                            const displayPrice = promoPeriod.price;
                            const displayPerMonth = hasExistingDiscount
                              ? period.price_per_month_kopeks
                              : Math.round(promoPeriod.price / (period.days / 30));

                            return (
                              <button
                                key={period.days}
                                onClick={() => {
                                  setSelectedTariffPeriod(period);
                                  setUseCustomDays(false);
                                }}
                                className={`relative rounded-xl border p-4 text-left transition-all ${
                                  selectedTariffPeriod?.days === period.days && !useCustomDays
                                    ? 'border-accent-500 bg-accent-500/10'
                                    : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600'
                                }`}
                              >
                                {displayDiscount && displayDiscount > 0 && (
                                  <div
                                    className={`absolute -right-2 -top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                                      hasExistingDiscount ? 'bg-success-500' : 'bg-orange-500'
                                    }`}
                                  >
                                    -{displayDiscount}%
                                  </div>
                                )}
                                <div className="text-lg font-semibold text-dark-100">
                                  {period.label}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-accent-400">
                                    {formatPrice(displayPrice)}
                                  </span>
                                  {displayOriginal && displayOriginal > displayPrice && (
                                    <span className="text-sm text-dark-500 line-through">
                                      {formatPrice(displayOriginal)}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-xs text-dark-500">
                                  {formatPrice(displayPerMonth)}/{t('subscription.month')}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Custom days option */}
                      {selectedTariff.custom_days_enabled &&
                        (selectedTariff.price_per_day_kopeks ?? 0) > 0 && (
                          <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="font-medium text-dark-200">
                                {t('subscription.customDays.title')}
                              </span>
                              <button
                                type="button"
                                onClick={() => setUseCustomDays(!useCustomDays)}
                                className={`relative h-6 w-10 rounded-full transition-colors ${
                                  useCustomDays ? 'bg-accent-500' : 'bg-dark-600'
                                }`}
                              >
                                <span
                                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                                    useCustomDays ? 'left-5' : 'left-1'
                                  }`}
                                />
                              </button>
                            </div>
                            {useCustomDays && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min={selectedTariff.min_days ?? 1}
                                    max={selectedTariff.max_days ?? 365}
                                    value={customDays}
                                    onChange={(e) => setCustomDays(parseInt(e.target.value))}
                                    className="flex-1 accent-accent-500"
                                  />
                                  <input
                                    type="number"
                                    value={customDays}
                                    min={selectedTariff.min_days ?? 1}
                                    max={selectedTariff.max_days ?? 365}
                                    onChange={(e) =>
                                      setCustomDays(
                                        Math.max(
                                          selectedTariff.min_days ?? 1,
                                          Math.min(
                                            selectedTariff.max_days ?? 365,
                                            parseInt(e.target.value) ||
                                              (selectedTariff.min_days ?? 1),
                                          ),
                                        ),
                                      )
                                    }
                                    className="w-20 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-center text-dark-100"
                                  />
                                </div>
                                {(() => {
                                  const basePrice =
                                    customDays * (selectedTariff.price_per_day_kopeks ?? 0);
                                  const hasExistingDiscount = !!(
                                    selectedTariff.original_price_per_day_kopeks &&
                                    selectedTariff.original_price_per_day_kopeks >
                                      (selectedTariff.price_per_day_kopeks ?? 0)
                                  );
                                  const promoCustom = applyPromoDiscount(
                                    basePrice,
                                    hasExistingDiscount,
                                  );
                                  return (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-dark-400">
                                        {t('subscription.days', { count: customDays })} ×{' '}
                                        {formatPrice(selectedTariff.price_per_day_kopeks ?? 0)}/
                                        {t('subscription.customDays.perDay')}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-accent-400">
                                          {formatPrice(promoCustom.price)}
                                        </span>
                                        {promoCustom.original && (
                                          <>
                                            <span className="text-xs text-dark-500 line-through">
                                              {formatPrice(promoCustom.original)}
                                            </span>
                                            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs text-orange-400">
                                              -{promoCustom.percent}%
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Custom traffic option */}
                    {selectedTariff.custom_traffic_enabled &&
                      (selectedTariff.traffic_price_per_gb_kopeks ?? 0) > 0 && (
                        <div>
                          <div className="mb-3 text-sm text-dark-400">
                            {t('subscription.customTraffic.label')}
                          </div>
                          <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="font-medium text-dark-200">
                                {t('subscription.customTraffic.selectVolume')}
                              </span>
                              <button
                                type="button"
                                onClick={() => setUseCustomTraffic(!useCustomTraffic)}
                                className={`relative h-6 w-10 rounded-full transition-colors ${
                                  useCustomTraffic ? 'bg-accent-500' : 'bg-dark-600'
                                }`}
                              >
                                <span
                                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                                    useCustomTraffic ? 'left-5' : 'left-1'
                                  }`}
                                />
                              </button>
                            </div>
                            {!useCustomTraffic && (
                              <div className="text-sm text-dark-400">
                                {t('subscription.customTraffic.default', {
                                  label: selectedTariff.traffic_limit_label,
                                })}
                              </div>
                            )}
                            {useCustomTraffic && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min={selectedTariff.min_traffic_gb ?? 1}
                                    max={selectedTariff.max_traffic_gb ?? 1000}
                                    value={customTrafficGb}
                                    onChange={(e) => setCustomTrafficGb(parseInt(e.target.value))}
                                    className="flex-1 accent-accent-500"
                                  />
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={customTrafficGb}
                                      min={selectedTariff.min_traffic_gb ?? 1}
                                      max={selectedTariff.max_traffic_gb ?? 1000}
                                      onChange={(e) =>
                                        setCustomTrafficGb(
                                          Math.max(
                                            selectedTariff.min_traffic_gb ?? 1,
                                            Math.min(
                                              selectedTariff.max_traffic_gb ?? 1000,
                                              parseInt(e.target.value) ||
                                                (selectedTariff.min_traffic_gb ?? 1),
                                            ),
                                          ),
                                        )
                                      }
                                      className="w-20 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-center text-dark-100"
                                    />
                                    <span className="text-dark-400">{t('common.units.gb')}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-dark-400">
                                    {customTrafficGb} {t('common.units.gb')} ×{' '}
                                    {formatPrice(selectedTariff.traffic_price_per_gb_kopeks ?? 0)}/
                                    {t('common.units.gb')}
                                  </span>
                                  <span className="font-medium text-accent-400">
                                    +
                                    {formatPrice(
                                      customTrafficGb *
                                        (selectedTariff.traffic_price_per_gb_kopeks ?? 0),
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Summary & Purchase */}
                    {(selectedTariffPeriod || useCustomDays) && (
                      <div className="rounded-xl bg-dark-800/50 p-5">
                        {(() => {
                          // Calculate prices with promo discount
                          const basePeriodPrice = useCustomDays
                            ? customDays * (selectedTariff.price_per_day_kopeks ?? 0)
                            : selectedTariffPeriod?.price_kopeks || 0;
                          const hasExistingPeriodDiscount =
                            !useCustomDays && selectedTariffPeriod?.original_price_kopeks
                              ? selectedTariffPeriod.original_price_kopeks >
                                selectedTariffPeriod.price_kopeks
                              : false;
                          const promoPeriod = applyPromoDiscount(
                            basePeriodPrice,
                            hasExistingPeriodDiscount,
                          );

                          const trafficPrice =
                            useCustomTraffic && selectedTariff.custom_traffic_enabled
                              ? customTrafficGb * (selectedTariff.traffic_price_per_gb_kopeks ?? 0)
                              : 0;

                          const totalPrice = promoPeriod.price + trafficPrice;
                          const originalTotal = promoPeriod.original
                            ? promoPeriod.original + trafficPrice
                            : null;

                          return (
                            <>
                              {/* Price breakdown */}
                              <div className="mb-4 space-y-2">
                                {useCustomDays ? (
                                  <div className="flex justify-between text-sm text-dark-300">
                                    <span>
                                      {t('subscription.stepPeriod')}:{' '}
                                      {t('subscription.days', { count: customDays })}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span>{formatPrice(promoPeriod.price)}</span>
                                      {promoPeriod.original && (
                                        <span className="text-xs text-dark-500 line-through">
                                          {formatPrice(promoPeriod.original)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  selectedTariffPeriod && (
                                    <>
                                      {/* Если есть доп. устройства - показываем разбивку */}
                                      {(selectedTariffPeriod.extra_devices_count ?? 0) > 0 &&
                                      selectedTariffPeriod.base_tariff_price_kopeks ? (
                                        <>
                                          <div className="flex justify-between text-sm text-dark-300">
                                            <span>
                                              {t('subscription.baseTariff')}:{' '}
                                              {selectedTariffPeriod.label}
                                            </span>
                                            <span>
                                              {formatPrice(
                                                selectedTariffPeriod.base_tariff_price_kopeks,
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-sm text-dark-300">
                                            <span>
                                              {t('subscription.extraDevices')} (
                                              {selectedTariffPeriod.extra_devices_count})
                                            </span>
                                            <span>
                                              +
                                              {formatPrice(
                                                selectedTariffPeriod.extra_devices_cost_kopeks ?? 0,
                                              )}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex justify-between text-sm text-dark-300">
                                          <span>
                                            {t('subscription.summary.period', {
                                              label: selectedTariffPeriod.label,
                                            })}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <span>{formatPrice(promoPeriod.price)}</span>
                                            {(hasExistingPeriodDiscount ||
                                              promoPeriod.original) && (
                                              <span className="text-xs text-dark-500 line-through">
                                                {formatPrice(
                                                  hasExistingPeriodDiscount
                                                    ? selectedTariffPeriod.original_price_kopeks!
                                                    : promoPeriod.original!,
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )
                                )}
                                {useCustomTraffic && selectedTariff.custom_traffic_enabled && (
                                  <div className="flex justify-between text-sm text-dark-300">
                                    <span>
                                      {t('subscription.summary.traffic', { gb: customTrafficGb })}
                                    </span>
                                    <span>+{formatPrice(trafficPrice)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Promo discount info */}
                              {promoPeriod.percent && (
                                <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-2">
                                  <span className="text-sm font-medium text-orange-400">
                                    {t('promo.discountApplied')} -{promoPeriod.percent}%
                                  </span>
                                </div>
                              )}

                              <div className="mb-4 flex items-center justify-between border-t border-dark-700/50 pt-2">
                                <span className="font-medium text-dark-100">
                                  {t('subscription.total')}
                                </span>
                                <div className="text-right">
                                  <span className="text-2xl font-bold text-accent-400">
                                    {formatPrice(totalPrice)}
                                  </span>
                                  {originalTotal && (
                                    <div className="text-sm text-dark-500 line-through">
                                      {formatPrice(originalTotal)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => tariffPurchaseMutation.mutate()}
                                disabled={tariffPurchaseMutation.isPending}
                                className="btn-primary w-full py-3"
                              >
                                {tariffPurchaseMutation.isPending ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    {t('common.loading')}
                                  </span>
                                ) : (
                                  t('subscription.purchase')
                                )}
                              </button>
                            </>
                          );
                        })()}

                        {tariffPurchaseMutation.isError &&
                          !getInsufficientBalanceError(tariffPurchaseMutation.error) && (
                            <div className="mt-3 text-center text-sm text-error-400">
                              {getErrorMessage(tariffPurchaseMutation.error)}
                            </div>
                          )}
                        {tariffPurchaseMutation.isError &&
                          getInsufficientBalanceError(tariffPurchaseMutation.error) && (
                            <div className="mt-3">
                              <InsufficientBalancePrompt
                                missingAmountKopeks={
                                  getInsufficientBalanceError(tariffPurchaseMutation.error)
                                    ?.missingAmount || 0
                                }
                                compact
                              />
                            </div>
                          )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Purchase/Extend Section - Classic Mode */}
      {classicOptions && classicOptions.periods.length > 0 && (
        <div ref={tariffsCardRef} className="bento-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark-100">
              {subscription && !subscription.is_trial
                ? t('subscription.extend')
                : t('subscription.getSubscription')}
            </h2>
            {!showPurchaseForm && (
              <button onClick={() => setShowPurchaseForm(true)} className="btn-primary">
                {subscription && !subscription.is_trial
                  ? t('subscription.extend')
                  : t('subscription.getSubscription')}
              </button>
            )}
          </div>

          {showPurchaseForm && (
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="mb-6 flex items-center justify-between">
                <div className="text-sm text-dark-400">
                  {t('subscription.step', { current: currentStepIndex + 1, total: steps.length })}
                </div>
                <div className="flex gap-2">
                  {steps.map((step, idx) => (
                    <div
                      key={step}
                      className={`h-1 w-8 rounded-full transition-colors ${
                        idx <= currentStepIndex ? 'bg-accent-500' : 'bg-dark-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-4 text-lg font-medium text-dark-100">
                {getStepLabel(currentStep)}
              </div>

              {/* Step: Period Selection */}
              {currentStep === 'period' && classicOptions && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {classicOptions.periods.map((period) => {
                    const hasExistingDiscount = !!(
                      period.discount_percent && period.discount_percent > 0
                    );
                    const promoPeriod = applyPromoDiscount(
                      period.price_kopeks,
                      hasExistingDiscount,
                    );
                    const displayDiscount = hasExistingDiscount
                      ? period.discount_percent
                      : promoPeriod.percent;
                    const displayOriginal = hasExistingDiscount
                      ? period.original_price_kopeks
                      : promoPeriod.original;

                    return (
                      <button
                        key={period.id}
                        onClick={() => {
                          setSelectedPeriod(period);
                          if (period.traffic.current !== undefined) {
                            setSelectedTraffic(period.traffic.current);
                          }
                          if (period.servers.selected) {
                            const availUuids = new Set(
                              period.servers.options
                                ?.filter((s) => s.is_available)
                                .map((s) => s.uuid) ?? [],
                            );
                            setSelectedServers(
                              period.servers.selected.filter((uuid) => availUuids.has(uuid)),
                            );
                          }
                          if (period.devices.current) {
                            setSelectedDevices(period.devices.current);
                          }
                        }}
                        className={`bento-card-hover relative p-4 text-left transition-all ${
                          selectedPeriod?.id === period.id
                            ? 'bento-card-glow border-accent-500'
                            : ''
                        }`}
                      >
                        {displayDiscount && displayDiscount > 0 && (
                          <div
                            className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                              hasExistingDiscount ? 'bg-success-500' : 'bg-orange-500'
                            }`}
                          >
                            -{displayDiscount}%
                          </div>
                        )}
                        <div className="text-lg font-semibold text-dark-100">{period.label}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-accent-400">
                            {formatPrice(promoPeriod.price)}
                          </span>
                          {displayOriginal && displayOriginal > promoPeriod.price && (
                            <span className="text-sm text-dark-500 line-through">
                              {formatPrice(displayOriginal)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step: Traffic Selection */}
              {currentStep === 'traffic' && selectedPeriod?.traffic.options && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {selectedPeriod.traffic.options.map((option) => {
                    const hasExistingDiscount = !!(
                      option.discount_percent && option.discount_percent > 0
                    );
                    const promoTraffic = applyPromoDiscount(
                      option.price_kopeks,
                      hasExistingDiscount,
                    );

                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedTraffic(option.value)}
                        disabled={!option.is_available}
                        className={`bento-card-hover relative p-4 text-center transition-all ${
                          selectedTraffic === option.value
                            ? 'bento-card-glow border-accent-500'
                            : ''
                        } ${!option.is_available ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        {(() => {
                          const trafficDisplayDiscount = hasExistingDiscount
                            ? option.discount_percent
                            : promoTraffic.percent;
                          const trafficDisplayOriginal = hasExistingDiscount
                            ? option.original_price_kopeks
                            : promoTraffic.original;
                          return (
                            <>
                              {trafficDisplayDiscount && trafficDisplayDiscount > 0 && (
                                <div
                                  className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                                    hasExistingDiscount ? 'bg-success-500' : 'bg-orange-500'
                                  }`}
                                >
                                  -{trafficDisplayDiscount}%
                                </div>
                              )}
                              <div className="text-lg font-semibold text-dark-100">
                                {option.label}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                                <span className="text-accent-400">
                                  {formatPrice(promoTraffic.price)}
                                </span>
                                {trafficDisplayOriginal &&
                                  trafficDisplayOriginal > promoTraffic.price && (
                                    <span className="text-xs text-dark-500 line-through">
                                      {formatPrice(trafficDisplayOriginal)}
                                    </span>
                                  )}
                              </div>
                            </>
                          );
                        })()}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step: Server Selection */}
              {currentStep === 'servers' && selectedPeriod?.servers.options && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedPeriod.servers.options
                    // Hide unavailable (disabled) servers and trial servers for existing trial users
                    .filter((server) => {
                      if (!server.is_available) return false;
                      if (subscription?.is_trial && server.name.toLowerCase().includes('trial')) {
                        return false;
                      }
                      return true;
                    })
                    .map((server) => {
                      const hasExistingDiscount = !!(
                        server.discount_percent && server.discount_percent > 0
                      );
                      const promoServer = applyPromoDiscount(
                        server.price_kopeks,
                        hasExistingDiscount,
                      );

                      return (
                        <button
                          key={server.uuid}
                          onClick={() => toggleServer(server.uuid)}
                          disabled={!server.is_available}
                          className={`relative rounded-xl border p-4 text-left transition-all ${
                            selectedServers.includes(server.uuid)
                              ? 'border-accent-500 bg-accent-500/10'
                              : server.is_available
                                ? 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600'
                                : 'cursor-not-allowed border-dark-800/30 bg-dark-900/30 opacity-50'
                          }`}
                        >
                          {(() => {
                            const serverDisplayDiscount = hasExistingDiscount
                              ? server.discount_percent
                              : promoServer.percent;
                            return serverDisplayDiscount && serverDisplayDiscount > 0 ? (
                              <div
                                className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-sm ${
                                  hasExistingDiscount ? 'bg-success-500' : 'bg-orange-500'
                                }`}
                              >
                                -{serverDisplayDiscount}%
                              </div>
                            ) : null;
                          })()}
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${
                                selectedServers.includes(server.uuid)
                                  ? 'border-accent-500 bg-accent-500'
                                  : 'border-dark-600'
                              }`}
                            >
                              {selectedServers.includes(server.uuid) && <CheckIcon />}
                            </div>
                            <div>
                              <div className="font-medium text-dark-100">{server.name}</div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm text-accent-400">
                                  {formatPrice(promoServer.price)}
                                  {t('subscription.perMonth')}
                                </span>
                                {(() => {
                                  const serverOriginal = hasExistingDiscount
                                    ? server.original_price_kopeks
                                    : promoServer.original;
                                  return serverOriginal && serverOriginal > promoServer.price ? (
                                    <span className="text-xs text-dark-500 line-through">
                                      {formatPrice(serverOriginal)}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Step: Device Selection */}
              {currentStep === 'devices' && selectedPeriod && (
                <div className="flex flex-col items-center py-8">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() =>
                        setSelectedDevices(
                          Math.max(selectedPeriod.devices.min, selectedDevices - 1),
                        )
                      }
                      disabled={selectedDevices <= selectedPeriod.devices.min}
                      className="btn-secondary flex h-14 w-14 items-center justify-center !p-0 text-2xl"
                    >
                      -
                    </button>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-dark-100">{selectedDevices}</div>
                      <div className="mt-2 text-dark-500">{t('subscription.devices')}</div>
                    </div>
                    <button
                      onClick={() =>
                        setSelectedDevices(
                          Math.min(selectedPeriod.devices.max, selectedDevices + 1),
                        )
                      }
                      disabled={selectedDevices >= selectedPeriod.devices.max}
                      className="btn-secondary flex h-14 w-14 items-center justify-center !p-0 text-2xl"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-4 space-y-1 text-center text-sm text-dark-500">
                    <div className="text-accent-400">
                      {t('subscription.devicesFree', { count: selectedPeriod.devices.min })}
                    </div>
                    {selectedPeriod.devices.max > selectedPeriod.devices.min && (
                      <div>
                        {formatPrice(selectedPeriod.devices.price_per_device_kopeks)}{' '}
                        {t('subscription.perExtraDevice')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Confirm */}
              {currentStep === 'confirm' && (
                <div>
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                    </div>
                  ) : preview ? (
                    <div className="space-y-4 rounded-xl bg-dark-800/50 p-5">
                      {/* Active promo discount banner */}
                      {activeDiscount?.is_active &&
                        activeDiscount.discount_percent &&
                        !preview.original_price_kopeks && (
                          <div className="flex items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                            <svg
                              className="h-4 w-4 text-orange-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-orange-400">
                              {t('promo.discountApplied')} -{activeDiscount.discount_percent}%
                            </span>
                          </div>
                        )}

                      {preview.breakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-dark-300">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>
                      ))}

                      {(() => {
                        // Apply promo discount if not already applied by server
                        const hasServerDiscount = !!preview.original_price_kopeks;
                        const promoTotal = applyPromoDiscount(
                          preview.total_price_kopeks,
                          hasServerDiscount,
                        );
                        const displayTotal = promoTotal.price;
                        const displayOriginal = hasServerDiscount
                          ? preview.original_price_kopeks
                          : promoTotal.original;

                        return (
                          <div className="flex items-center justify-between border-t border-dark-700/50 pt-4">
                            <span className="text-lg font-semibold text-dark-100">
                              {t('subscription.total')}
                            </span>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-accent-400">
                                {formatPrice(displayTotal)}
                              </div>
                              {displayOriginal && (
                                <div className="text-sm text-dark-500 line-through">
                                  {formatPrice(displayOriginal)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {preview.discount_label && (
                        <div className="text-center text-sm text-success-400">
                          {preview.discount_label}
                        </div>
                      )}

                      {!preview.can_purchase &&
                        (preview.missing_amount_kopeks > 0 ? (
                          <InsufficientBalancePrompt
                            missingAmountKopeks={preview.missing_amount_kopeks}
                            compact
                          />
                        ) : preview.status_message ? (
                          <div className="rounded-lg bg-error-500/10 px-4 py-3 text-center text-sm text-error-400">
                            {preview.status_message}
                          </div>
                        ) : null)}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 border-t border-dark-800/50 pt-4">
                {!isFirstStep && (
                  <button onClick={goToPrevStep} className="btn-secondary flex-1">
                    {t('common.back')}
                  </button>
                )}

                {isFirstStep && (
                  <button onClick={resetPurchase} className="btn-secondary">
                    {t('common.cancel')}
                  </button>
                )}

                {!isLastStep ? (
                  <button
                    onClick={goToNextStep}
                    disabled={!selectedPeriod}
                    className="btn-primary flex-1"
                  >
                    {t('common.next')}
                  </button>
                ) : (
                  <button
                    onClick={() => purchaseMutation.mutate()}
                    disabled={
                      purchaseMutation.isPending || previewLoading || !preview?.can_purchase
                    }
                    className="btn-primary flex-1"
                  >
                    {purchaseMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {t('common.loading')}
                      </span>
                    ) : (
                      t('subscription.purchase')
                    )}
                  </button>
                )}
              </div>

              {purchaseMutation.isError && (
                <div className="text-center text-sm text-error-400">
                  {getErrorMessage(purchaseMutation.error)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && <ConnectionModal onClose={() => setShowConnectionModal(false)} />}
    </div>
  );
}
