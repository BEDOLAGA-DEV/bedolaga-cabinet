import apiClient from './client';

// ============ Period Params ============

export interface SalesStatsParams {
  days?: number;
  start_date?: string;
  end_date?: string;
}

// ============ Summary ============

export interface SalesSummary {
  total_revenue_kopeks: number;
  manual_topup_kopeks: number;
  active_subscriptions: number;
  active_trials: number;
  new_trials: number;
  new_paid_subscriptions: number;
  expired_subscriptions: number;
  trial_to_paid_conversion: number;
  renewals_count: number;
  addon_revenue_kopeks: number;
}

// ============ Trials ============

export interface ProviderBreakdownItem {
  provider: string;
  count: number;
}

export interface DailyTrialItem {
  date: string;
  registrations: number;
  trials: number;
}

export interface TrialsStats {
  total_trials: number;
  total_registrations: number;
  conversion_rate: number;
  avg_trial_duration_days: number;
  by_provider: ProviderBreakdownItem[];
  daily: DailyTrialItem[];
}

// ============ Sales ============

export interface SalesByTariffItem {
  tariff_id: number;
  tariff_name: string;
  count: number;
}

export interface SalesByPeriodItem {
  period_days: number;
  count: number;
}

export interface DailySalesItem {
  date: string;
  count: number;
  revenue_kopeks: number;
}

export interface DailyTariffSalesItem {
  date: string;
  tariff_name: string;
  count: number;
}

export interface SalesStats {
  total_sales: number;
  total_revenue_kopeks: number;
  avg_order_kopeks: number;
  top_tariff_name: string;
  by_tariff: SalesByTariffItem[];
  by_period: SalesByPeriodItem[];
  daily: DailySalesItem[];
  daily_by_tariff: DailyTariffSalesItem[];
}

// ============ Renewals ============

export interface RenewalPeriodStats {
  count: number;
  revenue_kopeks: number;
}

export interface RenewalChange {
  absolute: number;
  percent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DailyRenewalItem {
  date: string;
  count: number;
}

export interface RenewalsStats {
  total_renewals: number;
  total_revenue_kopeks: number;
  renewal_rate: number;
  current_period: RenewalPeriodStats;
  previous_period: RenewalPeriodStats;
  change: RenewalChange;
  daily: DailyRenewalItem[];
}

// ============ Add-ons ============

export interface AddonByPackageItem {
  traffic_gb: number;
  count: number;
}

export interface DailyAddonItem {
  date: string;
  count: number;
  total_gb: number;
}

export interface DailyDeviceItem {
  date: string;
  count: number;
}

export interface AddonsStats {
  total_purchases: number;
  total_gb_purchased: number;
  addon_revenue_kopeks: number;
  device_purchases: number;
  device_revenue_kopeks: number;
  by_package: AddonByPackageItem[];
  daily: DailyAddonItem[];
  daily_devices: DailyDeviceItem[];
}

// ============ Deposits ============

export interface DepositByMethodItem {
  method: string;
  count: number;
  amount_kopeks: number;
}

export interface DailyDepositItem {
  date: string;
  count: number;
  amount_kopeks: number;
}

export interface DailyDepositByMethodItem {
  date: string;
  method: string;
  amount_kopeks: number;
}

export interface DepositsStats {
  total_deposits: number;
  total_amount_kopeks: number;
  avg_deposit_kopeks: number;
  by_method: DepositByMethodItem[];
  daily: DailyDepositItem[];
  daily_by_method: DailyDepositByMethodItem[];
}

export interface GatewaySuccessItem {
  method: string;
  total: number;
  paid: number;
  success_rate: number;
}

export interface PaymentHealth {
  total_attempts: number;
  total_paid: number;
  success_rate: number;
  failed_purchases: number;
  by_gateway: GatewaySuccessItem[];
}

// ============ API ============

export const salesStatsApi = {
  getSummary: async (params: SalesStatsParams = {}): Promise<SalesSummary> => {
    const response = await apiClient.get('/cabinet/admin/stats/sales/summary', { params });
    return response.data;
  },

  getTrials: async (params: SalesStatsParams = {}): Promise<TrialsStats> => {
    const response = await apiClient.get('/cabinet/admin/stats/sales/trials', { params });
    return response.data;
  },

  getSales: async (params: SalesStatsParams = {}): Promise<SalesStats> => {
    const response = await apiClient.get('/cabinet/admin/stats/sales/subscriptions', { params });
    return response.data;
  },

  getRenewals: async (params: SalesStatsParams = {}): Promise<RenewalsStats> => {
    const response = await apiClient.get('/cabinet/admin/stats/sales/renewals', { params });
    return response.data;
  },

  getAddons: async (params: SalesStatsParams = {}): Promise<AddonsStats> => {
    const response = await apiClient.get('/cabinet/admin/stats/sales/addons', { params });
    return response.data;
  },

  getDeposits: async (params: SalesStatsParams = {}): Promise<DepositsStats> => {
    const response = await apiClient.get('/cabinet/admin/stats/sales/deposits', { params });
    return response.data;
  },

  getPaymentHealth: async (params: SalesStatsParams = {}): Promise<PaymentHealth> => {
    const response = await apiClient.get('/cabinet/admin/stats/sales/payment-health', { params });
    return response.data;
  },
};
