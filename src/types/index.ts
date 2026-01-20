// User types
export interface User {
  id: number
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  email_verified: boolean
  balance_kopeks: number
  balance_rubles: number
  referral_code: string | null
  language: string
  created_at: string
}

// Auth types
export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// Subscription types
export interface ServerInfo {
  uuid: string
  name: string
  country_code: string | null
}

export interface TrafficPurchase {
  id: number
  traffic_gb: number
  expires_at: string
  created_at: string
  days_remaining: number
  progress_percent: number
}

export interface Subscription {
  id: number
  status: string
  is_trial: boolean
  start_date: string
  end_date: string
  days_left: number
  hours_left: number
  minutes_left: number
  time_left_display: string
  traffic_limit_gb: number
  traffic_used_gb: number
  traffic_used_percent: number
  device_limit: number
  connected_squads: string[]
  servers: ServerInfo[]
  autopay_enabled: boolean
  autopay_days_before: number
  subscription_url: string | null
  hide_subscription_link: boolean
  is_active: boolean
  is_expired: boolean
  traffic_purchases?: TrafficPurchase[]
  // Daily tariff fields
  is_daily?: boolean
  is_daily_paused?: boolean
  daily_price_kopeks?: number
  next_daily_charge_at?: string  // ISO datetime string
  // Tariff info
  tariff_id?: number
  tariff_name?: string
}

// Device types
export interface Device {
  hwid: string
  platform: string
  device_model: string
  created_at: string | null
}

export interface DevicesResponse {
  devices: Device[]
  total: number
  device_limit: number
}

// Tariff switch preview
export interface TariffSwitchPreview {
  can_switch: boolean
  current_tariff_id: number | null
  current_tariff_name: string | null
  new_tariff_id: number
  new_tariff_name: string
  remaining_days: number
  upgrade_cost_kopeks: number
  upgrade_cost_label: string
  balance_kopeks: number
  balance_label: string
  has_enough_balance: boolean
  missing_amount_kopeks: number
  missing_amount_label: string
  is_upgrade: boolean
}

export interface RenewalOption {
  period_days: number
  price_kopeks: number
  price_rubles: number
  discount_percent: number
  original_price_kopeks: number | null
}

export interface TrafficPackage {
  gb: number
  price_kopeks: number
  price_rubles: number
  is_unlimited: boolean
}

export interface TrialInfo {
  is_available: boolean
  duration_days: number
  traffic_limit_gb: number
  device_limit: number
  requires_payment: boolean
  price_kopeks: number
  price_rubles: number
  reason_unavailable: string | null
}

// Purchase options types
export interface TrafficOption {
  value: number
  label: string
  price_kopeks: number
  price_label: string
  original_price_kopeks?: number
  original_price_label?: string
  discount_percent?: number
  is_available: boolean
  is_default?: boolean
}

export interface ServerOption {
  uuid: string
  name: string
  price_kopeks: number
  price_label: string
  original_price_kopeks?: number
  original_price_label?: string
  discount_percent?: number
  is_available: boolean
}

export interface DevicesConfig {
  min: number
  max: number
  default: number
  current: number
  price_per_device_kopeks: number
  price_per_device_label: string
  price_per_device_original_kopeks?: number
  discount_percent?: number
}

export interface TrafficConfig {
  selectable: boolean
  mode: string
  options: TrafficOption[]
  default?: number
  current?: number
}

export interface ServersConfig {
  options: ServerOption[]
  min: number
  max: number
  default: string[]
  selected: string[]
}

export interface PeriodOption {
  id: string
  period_days: number
  months: number
  label: string
  price_kopeks: number
  price_label: string
  per_month_price_kopeks: number
  per_month_price_label: string
  discount_percent?: number
  original_price_kopeks?: number
  original_price_label?: string
  is_available: boolean
  traffic: TrafficConfig
  servers: ServersConfig
  devices: DevicesConfig
}

// Tariff types for tariffs mode
export interface TariffPeriod {
  days: number
  months: number
  label: string
  price_kopeks: number
  price_label: string
  price_per_month_kopeks: number
  price_per_month_label: string
  // Discount info (if promo group discount applied)
  original_price_kopeks?: number
  original_price_label?: string
  original_per_month_kopeks?: number
  original_per_month_label?: string
  discount_percent?: number
  discount_amount_kopeks?: number
  discount_label?: string
}

export interface TariffServer {
  uuid: string
  name: string
}

export interface Tariff {
  id: number
  name: string
  description: string | null
  tier_level: number
  traffic_limit_gb: number
  traffic_limit_label: string
  is_unlimited_traffic: boolean
  device_limit: number
  servers_count: number
  servers: TariffServer[]
  periods: TariffPeriod[]
  is_current: boolean
  is_available: boolean
  // Custom days options
  custom_days_enabled?: boolean
  price_per_day_kopeks?: number
  min_days?: number
  max_days?: number
  // Custom traffic options
  custom_traffic_enabled?: boolean
  traffic_price_per_gb_kopeks?: number
  min_traffic_gb?: number
  max_traffic_gb?: number
  // Device price
  device_price_kopeks?: number
  // Traffic topup options
  traffic_topup_enabled?: boolean
  traffic_topup_packages?: number[]
  max_topup_traffic_gb?: number
  // Daily tariff options
  is_daily?: boolean
  daily_price_kopeks?: number
  // Promo group discount info
  promo_group_name?: string
  original_device_price_kopeks?: number
  device_discount_percent?: number
  original_daily_price_kopeks?: number
  daily_discount_percent?: number
  original_price_per_day_kopeks?: number
  custom_days_discount_percent?: number
}

export interface TariffsPurchaseOptions {
  sales_mode: 'tariffs'
  tariffs: Tariff[]
  current_tariff_id: number | null
  balance_kopeks: number
  balance_label: string
}

export interface ClassicPurchaseOptions {
  sales_mode: 'classic'
  currency: string
  balance_kopeks: number
  balance_label: string
  subscription_id: number | null
  periods: PeriodOption[]
  traffic: TrafficConfig
  servers: ServersConfig
  devices: DevicesConfig
  selection: {
    period_id: string
    period_days: number
    traffic_value: number
    servers: string[]
    devices: number
  }
}

export type PurchaseOptions = TariffsPurchaseOptions | ClassicPurchaseOptions

// Legacy type for backward compatibility
export interface LegacyPurchaseOptions {
  currency: string
  balance_kopeks: number
  balance_label: string
  subscription_id: number | null
  periods: PeriodOption[]
  traffic: TrafficConfig
  servers: ServersConfig
  devices: DevicesConfig
  selection: {
    period_id: string
    period_days: number
    traffic_value: number
    servers: string[]
    devices: number
  }
}

export interface PurchaseSelection {
  period_id?: string
  period_days?: number
  traffic_value?: number
  servers?: string[]
  devices?: number
}

export interface PurchasePreview {
  total_price_kopeks: number
  total_price_label: string
  original_price_kopeks?: number
  original_price_label?: string
  discount_percent?: number
  discount_label?: string
  per_month_price_kopeks: number
  per_month_price_label: string
  breakdown: { label: string; value: string }[]
  balance_kopeks: number
  balance_label: string
  missing_amount_kopeks: number
  missing_amount_label?: string
  can_purchase: boolean
  status_message?: string
}

// Balance types
export interface Balance {
  balance_kopeks: number
  balance_rubles: number
}

export interface Transaction {
  id: number
  type: string
  amount_kopeks: number
  amount_rubles: number
  description: string | null
  payment_method: string | null
  is_completed: boolean
  created_at: string
  completed_at: string | null
}

export interface PaymentMethodOption {
  id: string
  name: string
  description?: string | null
}

export interface PaymentMethod {
  id: string
  name: string
  description: string | null
  min_amount_kopeks: number
  max_amount_kopeks: number
  is_available: boolean
  options?: PaymentMethodOption[] | null
}

// Referral types
export interface ReferralInfo {
  referral_code: string
  referral_link: string
  total_referrals: number
  active_referrals: number
  total_earnings_kopeks: number
  total_earnings_rubles: number
  commission_percent: number
}

export interface ReferralTerms {
  is_enabled: boolean
  commission_percent: number
  minimum_topup_kopeks: number
  minimum_topup_rubles: number
  first_topup_bonus_kopeks: number
  first_topup_bonus_rubles: number
  inviter_bonus_kopeks: number
  inviter_bonus_rubles: number
}

// Ticket types
export interface TicketMessage {
  id: number
  message_text: string
  is_from_admin: boolean
  has_media: boolean
  media_type: string | null
  media_file_id: string | null
  media_caption: string | null
  created_at: string
}

export interface Ticket {
  id: number
  title: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  closed_at: string | null
  messages_count: number
  last_message: TicketMessage | null
}

export interface TicketDetail extends Omit<Ticket, 'messages_count' | 'last_message'> {
  is_reply_blocked: boolean
  messages: TicketMessage[]
}

export interface SupportConfig {
  tickets_enabled: boolean
  support_type: 'tickets' | 'profile' | 'url'
  support_url?: string | null
  support_username?: string | null
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

// App config types (for connection setup)
export interface LocalizedText {
  [key: string]: string
}

export interface AppButton {
  id?: string  // Unique identifier for React key (client-side only)
  buttonLink: string
  buttonText: LocalizedText
}

export interface AppStep {
  description: LocalizedText
  buttons?: AppButton[]
  title?: LocalizedText
}

export interface AppInfo {
  id: string
  name: string
  isFeatured: boolean
  deepLink?: string | null
  installationStep?: AppStep
  addSubscriptionStep?: AppStep
  connectAndUseStep?: AppStep
  additionalBeforeAddSubscriptionStep?: AppStep
  additionalAfterAddSubscriptionStep?: AppStep
}

export interface AppConfig {
  platforms: Record<string, AppInfo[]>
  platformNames: Record<string, LocalizedText>
  hasSubscription: boolean
  subscriptionUrl: string | null
  branding?: {
    name?: string
    logoUrl?: string
    supportUrl?: string
  }
}

// Pending payment types
export interface PendingPayment {
  id: number
  method: string
  method_display: string
  identifier: string
  amount_kopeks: number
  amount_rubles: number
  status: string
  status_emoji: string
  status_text: string
  is_paid: boolean
  is_checkable: boolean
  created_at: string
  expires_at: string | null
  payment_url: string | null
  user_id?: number
  user_telegram_id?: number
  user_username?: string | null
}

export interface ManualCheckResponse {
  success: boolean
  message: string
  payment: PendingPayment | null
  status_changed: boolean
  old_status: string | null
  new_status: string | null
}

// Ticket notifications types
export interface TicketNotification {
  id: number
  ticket_id: number
  notification_type: 'new_ticket' | 'admin_reply' | 'user_reply'
  message: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

export interface TicketNotificationList {
  items: TicketNotification[]
  unread_count: number
}

export interface UnreadCountResponse {
  unread_count: number
}

export interface TicketSettings {
  sla_enabled: boolean
  sla_minutes: number
  sla_check_interval_seconds: number
  sla_reminder_cooldown_minutes: number
  support_system_mode: string
  cabinet_user_notifications_enabled: boolean
  cabinet_admin_notifications_enabled: boolean
}
