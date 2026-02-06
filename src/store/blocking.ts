import { create } from 'zustand';

export type BlockingType = 'maintenance' | 'channel_subscription' | 'blacklisted' | null;

interface MaintenanceInfo {
  message: string;
  reason?: string;
}

interface ChannelSubscriptionInfo {
  message: string;
  channel_link?: string;
}

interface BlacklistedInfo {
  message: string;
}

interface BlockingState {
  blockingType: BlockingType;
  maintenanceInfo: MaintenanceInfo | null;
  channelInfo: ChannelSubscriptionInfo | null;
  blacklistedInfo: BlacklistedInfo | null;

  setMaintenance: (info: MaintenanceInfo) => void;
  setChannelSubscription: (info: ChannelSubscriptionInfo) => void;
  setBlacklisted: (info: BlacklistedInfo) => void;
  clearBlocking: () => void;
}

export const useBlockingStore = create<BlockingState>((set) => ({
  blockingType: null,
  maintenanceInfo: null,
  channelInfo: null,
  blacklistedInfo: null,

  setMaintenance: (info) =>
    set({
      blockingType: 'maintenance',
      maintenanceInfo: info,
      channelInfo: null,
      blacklistedInfo: null,
    }),

  setChannelSubscription: (info) =>
    set({
      blockingType: 'channel_subscription',
      channelInfo: info,
      maintenanceInfo: null,
      blacklistedInfo: null,
    }),

  setBlacklisted: (info) =>
    set({
      blockingType: 'blacklisted',
      blacklistedInfo: info,
      maintenanceInfo: null,
      channelInfo: null,
    }),

  clearBlocking: () =>
    set({
      blockingType: null,
      maintenanceInfo: null,
      channelInfo: null,
      blacklistedInfo: null,
    }),
}));
