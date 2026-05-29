import { create } from 'zustand';

export type BlockingType =
  | 'maintenance'
  | 'channel_subscription'
  | 'blacklisted'
  | 'account_deleted'
  | null;

interface MaintenanceInfo {
  message: string;
  reason?: string;
}

/**
 * User-facing channel subscription status returned by the blocking 403 response.
 * Intentionally separate from `RequiredChannel` (api/adminChannels.ts) which
 * represents the admin CRUD entity with `is_active` / `sort_order` fields.
 */
interface ChannelInfo {
  channel_id: string;
  channel_link?: string;
  title?: string;
  is_subscribed: boolean;
}

interface ChannelSubscriptionInfo {
  message: string;
  channel_link?: string;
  channels?: ChannelInfo[];
}

interface BlacklistedInfo {
  message: string;
}

interface AccountDeletedInfo {
  /** Backend-provided localized message. We may override with i18n key on render. */
  message: string;
  /** Bot username (without @) for building the Telegram deep link client-side as fallback. */
  bot_username?: string;
  /** Full Telegram deep-link URL (`https://t.me/<bot>?start=revive`). Empty when bot is unconfigured. */
  telegram_deep_link?: string;
}

interface BlockingState {
  blockingType: BlockingType;
  maintenanceInfo: MaintenanceInfo | null;
  channelInfo: ChannelSubscriptionInfo | null;
  blacklistedInfo: BlacklistedInfo | null;
  accountDeletedInfo: AccountDeletedInfo | null;

  setMaintenance: (info: MaintenanceInfo) => void;
  setChannelSubscription: (info: ChannelSubscriptionInfo) => void;
  setBlacklisted: (info: BlacklistedInfo) => void;
  setAccountDeleted: (info: AccountDeletedInfo) => void;
  clearBlocking: () => void;
}

export const useBlockingStore = create<BlockingState>((set) => ({
  blockingType: null,
  maintenanceInfo: null,
  channelInfo: null,
  blacklistedInfo: null,
  accountDeletedInfo: null,

  setMaintenance: (info) =>
    set({
      blockingType: 'maintenance',
      maintenanceInfo: info,
      channelInfo: null,
      blacklistedInfo: null,
      accountDeletedInfo: null,
    }),

  setChannelSubscription: (info) =>
    set({
      blockingType: 'channel_subscription',
      channelInfo: info,
      maintenanceInfo: null,
      blacklistedInfo: null,
      accountDeletedInfo: null,
    }),

  setBlacklisted: (info) =>
    set({
      blockingType: 'blacklisted',
      blacklistedInfo: info,
      maintenanceInfo: null,
      channelInfo: null,
      accountDeletedInfo: null,
    }),

  setAccountDeleted: (info) =>
    set({
      blockingType: 'account_deleted',
      accountDeletedInfo: info,
      maintenanceInfo: null,
      channelInfo: null,
      blacklistedInfo: null,
    }),

  clearBlocking: () =>
    set({
      blockingType: null,
      maintenanceInfo: null,
      channelInfo: null,
      blacklistedInfo: null,
      accountDeletedInfo: null,
    }),
}));
