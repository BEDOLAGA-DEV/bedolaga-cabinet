import { create } from 'zustand'

export type BlockingType = 'maintenance' | 'channel_subscription' | null

interface MaintenanceInfo {
  message: string
  reason?: string
}

interface ChannelSubscriptionInfo {
  message: string
  channel_link?: string
}

interface BlockingState {
  blockingType: BlockingType
  maintenanceInfo: MaintenanceInfo | null
  channelInfo: ChannelSubscriptionInfo | null

  setMaintenance: (info: MaintenanceInfo) => void
  setChannelSubscription: (info: ChannelSubscriptionInfo) => void
  clearBlocking: () => void
}

export const useBlockingStore = create<BlockingState>((set) => ({
  blockingType: null,
  maintenanceInfo: null,
  channelInfo: null,

  setMaintenance: (info) => set({
    blockingType: 'maintenance',
    maintenanceInfo: info,
    channelInfo: null,
  }),

  setChannelSubscription: (info) => set({
    blockingType: 'channel_subscription',
    channelInfo: info,
    maintenanceInfo: null,
  }),

  clearBlocking: () => set({
    blockingType: null,
    maintenanceInfo: null,
    channelInfo: null,
  }),
}))
