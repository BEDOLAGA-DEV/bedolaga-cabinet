import { useEffect } from 'react';
import { create } from 'zustand';

export type SuccessNotificationType =
  | 'balance_topup'
  | 'subscription_activated'
  | 'subscription_renewed'
  | 'subscription_purchased'
  | 'devices_purchased'
  | 'traffic_purchased';

export interface SuccessNotificationData {
  type: SuccessNotificationType;
  /** Amount in kopeks (for balance or subscription price) */
  amountKopeks?: number;
  /** New balance in kopeks */
  newBalanceKopeks?: number;
  /** Subscription expiry date ISO string */
  expiresAt?: string;
  /** Tariff name */
  tariffName?: string;
  /** Custom title override */
  title?: string;
  /** Custom message override */
  message?: string;
  /** Number of devices added */
  devicesAdded?: number;
  /** New total device limit */
  newDeviceLimit?: number;
  /** Traffic GB added */
  trafficGbAdded?: number;
  /** New total traffic limit in GB */
  newTrafficLimitGb?: number;
}

interface SuccessNotificationState {
  isOpen: boolean;
  data: SuccessNotificationData | null;
  /** Signal that increments when other modals should close */
  closeOthersSignal: number;

  show: (data: SuccessNotificationData) => void;
  hide: () => void;
}

export const useSuccessNotification = create<SuccessNotificationState>((set) => ({
  isOpen: false,
  data: null,
  closeOthersSignal: 0,

  show: (data) =>
    set((state) => ({
      isOpen: true,
      data,
      // Increment signal to tell other modals to close
      closeOthersSignal: state.closeOthersSignal + 1,
    })),
  hide: () => set({ isOpen: false, data: null }),
}));

/**
 * Hook that calls onClose when a success notification appears.
 * Use this in modals that should auto-close on success events.
 */
export function useCloseOnSuccessNotification(onClose: () => void) {
  const closeOthersSignal = useSuccessNotification((state) => state.closeOthersSignal);

  useEffect(() => {
    // Skip the initial render (signal = 0)
    if (closeOthersSignal > 0) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeOthersSignal]);
}
